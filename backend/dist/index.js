import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { processQuestionInBackground } from './aiProcessor.js';
import { buildMoodleCodeRunnerXml } from './moodleXmlBuilder.js';
const prisma = new PrismaClient();
const app = new Hono();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = (process.env.JWT_SECRET || '').trim();
if (isProduction && configuredJwtSecret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
const JWT_SECRET = configuredJwtSecret || randomBytes(32).toString('hex');
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim()).filter(Boolean);
const authAttempts = new Map();
if (!isProduction)
    console.log(`Server is running on port ${port}`);
// Periodic cleanup of stale rate-limit entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of authAttempts) {
        const recent = timestamps.filter(t => now - t < 15 * 60_000);
        if (recent.length === 0)
            authAttempts.delete(key);
        else
            authAttempts.set(key, recent);
    }
}, 5 * 60_000);
const safeEqual = (left, right) => {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
};
const rateLimitAuth = async (c, next) => {
    const remoteAddress = c.env?.incoming?.socket?.remoteAddress || 'local';
    const forwardedAddress = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const key = process.env.JOBWAY_TRUST_PROXY === '1' && forwardedAddress ? forwardedAddress : remoteAddress;
    const now = Date.now();
    const recent = (authAttempts.get(key) || []).filter(value => now - value < 15 * 60_000);
    if (recent.length >= 10)
        return c.json({ success: false, error: 'Too many attempts; try again later' }, 429);
    recent.push(now);
    authAttempts.set(key, recent);
    await next();
};
const requireAuth = async (c, next) => {
    const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
    const token = getCookie(c, 'jobway_session') || bearer;
    if (!token)
        return c.json({ success: false, error: 'Authentication required' }, 401);
    try {
        const payload = jwt.verify(token, JWT_SECRET, { issuer: 'job-way', audience: 'job-way-web' });
        if (!payload.id)
            throw new Error('Invalid token');
        c.set('userId', payload.id);
        await next();
    }
    catch {
        return c.json({ success: false, error: 'Invalid or expired session' }, 401);
    }
};
const requireAdmin = async (c, next) => {
    const expected = (process.env.ADMIN_API_TOKEN || '').trim();
    const supplied = c.req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (expected.length < 32)
        return c.json({ success: false, error: 'Administrative API disabled' }, 503);
    if (!safeEqual(supplied, expected))
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    await next();
};
const publicQuestion = (question) => {
    const { testCases: _testCases, metadata: _metadata, ...safe } = question;
    return safe;
};
// Allow m1's frontend to talk to your backend
app.use('/*', cors({
    origin: allowedOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
app.use('/*', secureHeaders({ crossOriginResourcePolicy: 'same-site', referrerPolicy: 'no-referrer' }));
app.use('/*', bodyLimit({ maxSize: 256 * 1024, onError: c => c.json({ success: false, error: 'Request body too large' }, 413) }));
app.use('/signup', rateLimitAuth);
app.use('/login', rateLimitAuth);
app.use('/api/ingest', requireAdmin);
app.use('/api/status/*', requireAdmin);
app.use('/api/staged', requireAdmin);
app.use('/api/staged/*', requireAdmin);
app.use('/submissions', requireAuth);
app.get('/', (c) => {
    return c.json({ status: 'live', message: 'Backend Engine is running 🚀' });
});
app.get('/health', (c) => {
    return c.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
// Phase 1: Ingestion API (For Scraper & Student Feeder)
app.post('/api/ingest', async (c) => {
    try {
        const { raw_text, source } = await c.req.json();
        if (typeof raw_text !== 'string' || !raw_text.trim() || raw_text.length > 50_000) {
            return c.json({ success: false, error: 'raw_text is required' }, 400);
        }
        const stagedQuestion = await prisma.stagedQuestion.create({
            data: {
                rawText: raw_text.trim(),
                source: typeof source === 'string' ? source.slice(0, 100) : 'Student',
                status: 'PENDING_AI',
            }
        });
        // Trigger AI processing in background
        processQuestionInBackground(stagedQuestion.id).catch(console.error);
        return c.json({
            success: true,
            message: 'Question ingested successfully',
            questionId: stagedQuestion.id
        });
    }
    catch (error) {
        console.error('Ingestion error:', error);
        return c.json({ success: false, error: 'Failed to ingest question' }, 500);
    }
});
// Phase 1: Status Polling API
app.get('/api/status/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const stagedQuestion = await prisma.stagedQuestion.findUnique({
            where: { id }
        });
        if (!stagedQuestion) {
            return c.json({ success: false, error: 'Question not found' }, 404);
        }
        return c.json({ success: true, status: stagedQuestion.status, data: stagedQuestion });
    }
    catch (error) {
        return c.json({ success: false, error: 'Failed to fetch status' }, 500);
    }
});
// Phase 1: Staged Questions API for Faculty UI (Supports status filter)
app.get('/api/staged', async (c) => {
    try {
        const status = c.req.query('status');
        const where = status ? { status } : {};
        const questions = await prisma.stagedQuestion.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return c.json({ success: true, data: questions });
    }
    catch (error) {
        return c.json({ success: false, error: 'Failed to fetch staged questions' }, 500);
    }
});
// Phase 1: Export Selected / All Staged Questions as Moodle CodeRunner XML
app.post('/api/staged/export-xml', async (c) => {
    try {
        const { questionIds } = await c.req.json();
        let questions = [];
        if (Array.isArray(questionIds) && questionIds.length > 0) {
            questions = await prisma.stagedQuestion.findMany({
                where: { id: { in: questionIds } }
            });
        }
        else {
            questions = await prisma.stagedQuestion.findMany({
                where: { status: 'STAGED' }
            });
        }
        const formatted = questions.map(q => ({
            id: q.id,
            title: q.title || 'Untitled Question',
            description: q.description || q.rawText,
            category: q.category || 'DSA',
            subtopic: q.subtopic || 'General',
            difficulty: 'Medium',
            testCases: q.testCases || []
        }));
        const xml = buildMoodleCodeRunnerXml(formatted);
        c.header('Content-Type', 'application/xml');
        c.header('Content-Disposition', 'attachment; filename="moodle_coderunner_export.xml"');
        return c.body(xml);
    }
    catch (error) {
        console.error('XML Export error:', error);
        return c.json({ success: false, error: 'Failed to generate XML' }, 500);
    }
});
// Phase 1: Update Staged Question (Edit title, taxonomy, testcases)
app.patch('/api/staged/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const updated = await prisma.stagedQuestion.update({
            where: { id },
            data: {
                ...(body.title && { title: body.title }),
                ...(body.category && { category: body.category }),
                ...(body.subtopic && { subtopic: body.subtopic }),
                ...(body.description && { description: body.description }),
                ...(body.testCases && { testCases: body.testCases })
            }
        });
        return c.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Update error:', error);
        return c.json({ success: false, error: 'Failed to update question' }, 500);
    }
});
// Phase 1: Approve Staged Question API
app.post('/api/staged/:id/approve', async (c) => {
    try {
        const id = c.req.param('id');
        const stagedQuestion = await prisma.stagedQuestion.findUnique({
            where: { id }
        });
        if (!stagedQuestion || stagedQuestion.status !== 'STAGED') {
            return c.json({ success: false, error: 'Question not ready for approval' }, 400);
        }
        // Move to main Question table
        const question = await prisma.question.create({
            data: {
                title: stagedQuestion.title || 'Untitled',
                description: stagedQuestion.description || stagedQuestion.rawText,
                category: stagedQuestion.category || 'General',
                subtopic: stagedQuestion.subtopic || 'General',
                type: 'Programming',
                difficulty: 'Medium',
                testCases: stagedQuestion.testCases || [],
                metadata: { constraints: stagedQuestion.constraints || '' }
            }
        });
        // Update status to APPROVED
        await prisma.stagedQuestion.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
        return c.json({ success: true, data: question });
    }
    catch (error) {
        console.error('Approval error:', error);
        return c.json({ success: false, error: 'Failed to approve question' }, 500);
    }
});
// Phase 1: Discard Staged Question API
app.delete('/api/staged/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await prisma.stagedQuestion.delete({
            where: { id }
        });
        return c.json({ success: true, message: 'Question discarded' });
    }
    catch (error) {
        console.error('Discard error:', error);
        return c.json({ success: false, error: 'Failed to discard question' }, 500);
    }
});
// Phase 2: Native Signup API
app.post('/signup', async (c) => {
    try {
        const { email, password, username } = await c.req.json();
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof username !== 'string' || username.trim().length < 2 || username.length > 40 || typeof password !== 'string' || password.length < 12 || password.length > 128) {
            return c.json({ success: false, error: 'Use a valid email, a 2–40 character username, and a password of at least 12 characters' }, 400);
        }
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return c.json({ success: false, error: 'Unable to create account with those details' }, 400);
        }
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                username: username.trim()
            }
        });
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '8h', issuer: 'job-way', audience: 'job-way-web' });
        setCookie(c, 'jobway_session', token, { httpOnly: true, secure: isProduction, sameSite: 'Lax', path: '/', maxAge: 8 * 60 * 60 });
        return c.json({ success: true, user: { id: newUser.id, username: newUser.username } });
    }
    catch (error) {
        console.error('Signup error:', error);
        return c.json({ success: false, error: 'Signup failed' }, 500);
    }
});
// Phase 2: Native Login API
app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128) {
            return c.json({ success: false, error: 'Invalid credentials' }, 401);
        }
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.password) {
            return c.json({ success: false, error: 'Invalid credentials' }, 401);
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return c.json({ success: false, error: 'Invalid credentials' }, 401);
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '8h', issuer: 'job-way', audience: 'job-way-web' });
        setCookie(c, 'jobway_session', token, { httpOnly: true, secure: isProduction, sameSite: 'Lax', path: '/', maxAge: 8 * 60 * 60 });
        return c.json({ success: true, user: { id: user.id, username: user.username } });
    }
    catch (error) {
        console.error('Login error:', error);
        return c.json({ success: false, error: 'Login failed' }, 500);
    }
});
// Phase 2: Advanced User Profile API (LeetCode Style)
app.get('/users/:id', requireAuth, async (c) => {
    try {
        const userId = c.req.param('id');
        if (c.get('userId') !== userId)
            return c.json({ success: false, error: 'Forbidden' }, 403);
        // Fetch user and all their submissions, including the related question data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                submissions: {
                    include: { question: true }
                }
            }
        });
        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }
        // Process data for the frontend dashboard
        const passedSubmissions = user.submissions.filter(sub => sub.status === 'Pass');
        // 1. Total Solved Count (Unique questions passed)
        const uniqueSolvedIds = new Set(passedSubmissions.map(sub => sub.questionId));
        const totalSolved = uniqueSolvedIds.size;
        // 2. Difficulty Breakdown (Easy, Medium, Hard)
        const difficultyStats = passedSubmissions.reduce((acc, sub) => {
            const diff = sub.question.difficulty || 'Medium';
            if (!acc[diff])
                acc[diff] = new Set();
            acc[diff].add(sub.questionId);
            return acc;
        }, {});
        const formattedDifficulty = {
            Easy: difficultyStats['Easy']?.size || 0,
            Medium: difficultyStats['Medium']?.size || 0,
            Hard: difficultyStats['Hard']?.size || 0,
        };
        // 3. Calendar Data (Submissions grouped by date for heatmap)
        const calendarData = user.submissions.reduce((acc, sub) => {
            const dateString = sub.submittedAt.toISOString().split('T')[0];
            acc[dateString] = (acc[dateString] || 0) + 1;
            return acc;
        }, {});
        // Calculate Max Streak and Total Active Days
        const activeDays = Object.keys(calendarData).sort();
        const totalActiveDays = activeDays.length;
        let maxStreak = 0;
        let currentStreak = 0;
        let previousDate = null;
        for (const dateStr of activeDays) {
            const date = new Date(dateStr);
            if (!previousDate) {
                currentStreak = 1;
            }
            else {
                const diffTime = Math.abs(date.getTime() - previousDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                }
                else {
                    currentStreak = 1;
                }
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            previousDate = date;
        }
        // Query for total questions
        const totalQuestions = await prisma.question.count();
        const totalEasy = await prisma.question.count({ where: { difficulty: 'Easy' } });
        const totalMedium = await prisma.question.count({ where: { difficulty: 'Medium' } });
        const totalHard = await prisma.question.count({ where: { difficulty: 'Hard' } });
        // Pass all the user fields from the schema as well
        return c.json({
            success: true,
            data: {
                username: user.username,
                joinedAt: user.createdAt,
                rank: user.rank,
                reputation: user.reputation,
                views: user.views,
                discuss: user.discuss,
                solution: user.solution,
                contestRating: user.contestRating,
                globalRanking: user.globalRanking,
                attendedContests: user.attendedContests,
                stats: {
                    totalSolved,
                    difficultyBreakdown: formattedDifficulty,
                    calendarHeatmap: calendarData,
                    totalActiveDays,
                    maxStreak
                },
                totalAvailable: {
                    Total: totalQuestions,
                    Easy: totalEasy,
                    Medium: totalMedium,
                    Hard: totalHard
                },
                recentSubmissions: user.submissions.slice(-10)
            }
        });
    }
    catch (error) {
        console.error('User fetch error:', error);
        return c.json({ success: false, error: 'Failed to fetch user profile' }, 500);
    }
});
// Phase 3: Record Submission API
app.post('/submissions', requireAuth, async (c) => {
    try {
        const { questionId, status, code, language } = await c.req.json();
        const userId = c.get('userId');
        if (typeof questionId !== 'string' || questionId.length > 100 || !['Pass', 'Fail', 'Evaluated'].includes(status) || typeof code !== 'string' || code.length > 50_000 || typeof language !== 'string' || language.length > 20) {
            return c.json({ success: false, error: 'Invalid submission' }, 400);
        }
        const submission = await prisma.submission.create({
            data: {
                userId,
                questionId,
                status,
                code,
                language
            }
        });
        return c.json({ success: true, data: submission });
    }
    catch (error) {
        console.error('Submission error:', error);
        return c.json({ success: false, error: 'Failed to record submission' }, 500);
    }
});
// Phase 2: GET Questions API
app.get('/questions', async (c) => {
    try {
        const questions = await prisma.question.findMany();
        return c.json({ success: true, data: questions.map(publicQuestion) });
    }
    catch (error) {
        console.error(error);
        return c.json({ success: false, error: 'Failed to fetch questions' }, 500);
    }
});
// GET Single Question API
app.get('/questions/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const question = await prisma.question.findUnique({
            where: { id }
        });
        if (!question) {
            return c.json({ success: false, error: 'Question not found' }, 404);
        }
        return c.json({ success: true, data: publicQuestion(question) });
    }
    catch (error) {
        console.error(error);
        return c.json({ success: false, error: 'Failed to fetch question' }, 500);
    }
});
app.post('/logout', (c) => {
    deleteCookie(c, 'jobway_session', { path: '/', secure: isProduction });
    return c.json({ success: true });
});
serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0'
});
