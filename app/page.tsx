'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Plus,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  analyzeResume,
  DEFAULT_JOB_DESCRIPTION,
  DEFAULT_RESUME,
  generateInterviewQuestions,
  jobsToCsv,
  Job,
  JobStage,
  MatchAnalysis,
  SEED_JOBS,
  STAGES,
} from '@/lib/jobloom';
import { runCareerAgent, type AgentRun } from '@/lib/agent';

type View = 'agent' | 'matcher' | 'pipeline' | 'interview' | 'analytics';

type ModelTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => object | Promise<object>;
};

type ModelContextApi = {
  registerTool: (
    tool: ModelTool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const STORAGE_KEY = 'jobloom:workspace:v1';
const ANSWERS_KEY = 'jobloom:interview-answers:v1';
const TASKS_KEY = 'jobloom:completed-tasks:v1';
const QUESTIONS_KEY = 'jobloom:completed-questions:v1';
const AGENT_KEY = 'jobloom:agent-run:v1';
const AGENT_APPROVALS_KEY = 'jobloom:agent-approvals:v1';

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'agent', label: 'Agent 控制台', icon: Bot },
  { id: 'matcher', label: '职位匹配', icon: FileSearch },
  { id: 'pipeline', label: '申请看板', icon: BriefcaseBusiness },
  { id: 'interview', label: '面试训练', icon: MessageSquareText },
  { id: 'analytics', label: '数据分析', icon: BarChart3 },
];

const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  agent: {
    eyebrow: '本地求职 Agent',
    title: '给 Agent 一个目标，让它编排下一步。',
    description: '自动调用分析工具、排列机会优先级，并在你批准后生成行动计划。',
  },
  matcher: {
    eyebrow: '简历诊断',
    title: '先看匹配，再决定是否投递。',
    description: '所有分析都在浏览器本地完成，不上传简历。',
  },
  pipeline: {
    eyebrow: '申请管理',
    title: '每一个机会，都有明确下一步。',
    description: '从收藏到 Offer，集中维护进度与跟进动作。',
  },
  interview: {
    eyebrow: '面试训练',
    title: '把经历练成清晰、有证据的故事。',
    description: '围绕真实职位生成问题，并沉淀你的回答。',
  },
  analytics: {
    eyebrow: '求职复盘',
    title: '用数据优化策略，而不是盲目海投。',
    description: '识别最有效的渠道、节奏和转化环节。',
  },
};

function companyInitials(company: string) {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function stageLabel(stage: JobStage) {
  return STAGES.find((item) => item.id === stage)?.label ?? stage;
}

function JobCard({
  job,
  onMove,
}: {
  job: Job;
  onMove: (id: string, stage: JobStage) => void;
}) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === job.stage);
  const previous = STAGES[currentIndex - 1]?.id;
  const next = STAGES[currentIndex + 1]?.id;

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(16,24,40,.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-[#0b1325] text-[12px] font-bold text-white">
          {companyInitials(job.company)}
        </div>
        <Badge variant="secondary" className="border-0 bg-emerald-50 text-[11px] font-semibold text-emerald-700">
          {job.score}% 匹配
        </Badge>
      </div>
      <p className="mt-4 truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {job.company}
      </p>
      <h4 className="mt-1 min-h-10 text-[14px] font-semibold leading-5 text-[#0b1325]">{job.role}</h4>
      <p className="mt-3 flex items-center gap-1.5 truncate text-[12px] text-slate-400">
        <MapPin className="size-3.5 shrink-0" />
        {job.location}
      </p>
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-[11px] font-medium text-slate-400">下一步</p>
        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-700">{job.nextStep}</p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-400">{job.createdAt}</span>
        <div className="flex gap-1 opacity-60 transition group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg"
            disabled={!previous}
            onClick={() => previous && onMove(job.id, previous)}
            aria-label={`将 ${job.company} 移到上一阶段`}
          >
            <ArrowLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg"
            disabled={!next}
            onClick={() => next && onMove(job.id, next)}
            aria-label={`将 ${job.company} 移到下一阶段`}
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>('agent');
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [hydrated, setHydrated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [todayLabel, setTodayLabel] = useState('今天');
  const [resume, setResume] = useState(DEFAULT_RESUME);
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB_DESCRIPTION);
  const [analysis, setAnalysis] = useState<MatchAnalysis>(() =>
    analyzeResume(DEFAULT_RESUME, DEFAULT_JOB_DESCRIPTION),
  );
  const [selectedInterviewJobId, setSelectedInterviewJobId] = useState('notion-product-designer');
  const [activeQuestionId, setActiveQuestionId] = useState('project-story');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [agentGoal, setAgentGoal] = useState('找出今天最该推进的机会，并给出可执行计划');
  const [agentRun, setAgentRun] = useState<AgentRun>(() =>
    runCareerAgent(
      '找出今天最该推进的机会，并给出可执行计划',
      SEED_JOBS,
      analyzeResume(DEFAULT_RESUME, DEFAULT_JOB_DESCRIPTION),
      '2026-09-09T09:30:00.000Z',
    ),
  );
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running'>('idle');
  const [visibleAgentSteps, setVisibleAgentSteps] = useState(4);
  const [approvedAgentTasks, setApprovedAgentTasks] = useState<string[]>([]);
  const [newJob, setNewJob] = useState({
    company: '',
    role: '',
    location: '',
    stage: 'saved' as JobStage,
  });
  const jobsRef = useRef(jobs);
  const analysisRef = useRef(analysis);

  const announce = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const storedJobs = window.localStorage.getItem(STORAGE_KEY);
        const storedAnswers = window.localStorage.getItem(ANSWERS_KEY);
        const storedTasks = window.localStorage.getItem(TASKS_KEY);
        const storedQuestions = window.localStorage.getItem(QUESTIONS_KEY);
        const storedAgent = window.localStorage.getItem(AGENT_KEY);
        const storedApprovals = window.localStorage.getItem(AGENT_APPROVALS_KEY);
        if (storedJobs) setJobs(JSON.parse(storedJobs) as Job[]);
        if (storedAnswers) setAnswers(JSON.parse(storedAnswers) as Record<string, string>);
        if (storedTasks) setCompletedTasks(JSON.parse(storedTasks) as string[]);
        if (storedQuestions) setCompletedQuestions(JSON.parse(storedQuestions) as string[]);
        if (storedAgent) setAgentRun(JSON.parse(storedAgent) as AgentRun);
        if (storedApprovals) setApprovedAgentTasks(JSON.parse(storedApprovals) as string[]);
      } catch {
        setJobs(SEED_JOBS);
      } finally {
        setHydrated(true);
      }

      setTodayLabel(
        new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(new Date()),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    jobsRef.current = jobs;
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs, hydrated]);

  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  }, [answers, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(TASKS_KEY, JSON.stringify(completedTasks));
  }, [completedTasks, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(QUESTIONS_KEY, JSON.stringify(completedQuestions));
  }, [completedQuestions, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(AGENT_KEY, JSON.stringify(agentRun));
  }, [agentRun, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(AGENT_APPROVALS_KEY, JSON.stringify(approvedAgentTasks));
  }, [approvedAgentTasks, hydrated]);

  const moveJob = useCallback(
    (id: string, stage: JobStage) => {
      setJobs((current) =>
        current.map((job) => (job.id === id ? { ...job, stage } : job)),
      );
      const company = jobsRef.current.find((job) => job.id === id)?.company ?? '职位';
      announce(`${company} 已移到“${stageLabel(stage)}”`);
    },
    [announce],
  );

  const runAnalysis = useCallback(() => {
    const result = analyzeResume(resume, jobDescription);
    setAnalysis(result);
    announce(`分析完成：匹配度 ${result.score}%`);
  }, [announce, jobDescription, resume]);

  const runAgent = useCallback(() => {
    const goal = agentGoal.trim() || '找出今天最该推进的机会';
    setAgentStatus('running');
    setVisibleAgentSteps(0);
    setApprovedAgentTasks([]);
    [1, 2, 3].forEach((step, index) => {
      window.setTimeout(() => setVisibleAgentSteps(step), 260 + index * 280);
    });
    window.setTimeout(() => {
      const result = runCareerAgent(goal, jobsRef.current, analysisRef.current);
      setAgentRun(result);
      setVisibleAgentSteps(result.actions.length);
      setAgentStatus('idle');
      announce('Agent 已完成计划，等待你的批准');
    }, 1180);
  }, [agentGoal, announce]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContextApi }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const validStages: JobStage[] = ['saved', 'applied', 'interview', 'offer'];

    const tools: ModelTool[] = [
      {
        name: 'run_job_search_agent',
        title: '运行求职 Agent',
        description: '让 Jobloom Agent 检查整个申请工作区，调用分析工具并生成需要人工批准的行动计划。',
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', minLength: 5 },
          },
          required: ['goal'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('输入必须是对象。');
          const value = input as Record<string, unknown>;
          if (typeof value.goal !== 'string' || value.goal.trim().length < 5) {
            throw new Error('goal 至少需要 5 个字符。');
          }
          const result = runCareerAgent(value.goal, jobsRef.current, analysisRef.current);
          setAgentGoal(value.goal);
          setAgentRun(result);
          setVisibleAgentSteps(result.actions.length);
          setApprovedAgentTasks([]);
          setActiveView('agent');
          return {
            runId: result.id,
            summary: result.summary,
            tasks: result.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              priority: task.priority,
            })),
          };
        },
      },
      {
        name: 'create_job_application',
        title: '添加求职机会',
        description: '在 Jobloom 申请看板中新增一个职位，并立即保存到本地工作区。',
        inputSchema: {
          type: 'object',
          properties: {
            company: { type: 'string', minLength: 1 },
            role: { type: 'string', minLength: 1 },
            location: { type: 'string' },
            stage: { type: 'string', enum: validStages },
          },
          required: ['company', 'role'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('输入必须是对象。');
          const value = input as Record<string, unknown>;
          if (typeof value.company !== 'string' || !value.company.trim()) {
            throw new Error('company 不能为空。');
          }
          if (typeof value.role !== 'string' || !value.role.trim()) {
            throw new Error('role 不能为空。');
          }
          const stage = validStages.includes(value.stage as JobStage)
            ? (value.stage as JobStage)
            : 'saved';
          const job: Job = {
            id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            company: value.company.trim(),
            role: value.role.trim(),
            location: typeof value.location === 'string' && value.location.trim() ? value.location.trim() : '待确认',
            stage,
            score: 70,
            createdAt: new Date().toISOString().slice(0, 10),
            nextStep: stage === 'saved' ? '完成职位匹配分析' : '安排下一次跟进',
          };
          setJobs((current) => [...current, job]);
          setActiveView('pipeline');
          return { id: job.id, company: job.company, role: job.role, stage: job.stage };
        },
      },
      {
        name: 'move_job_application',
        title: '推进申请阶段',
        description: '把现有职位移动到收藏、已申请、面试中或 Offer 阶段。',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
            stage: { type: 'string', enum: validStages },
          },
          required: ['id', 'stage'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('输入必须是对象。');
          const value = input as Record<string, unknown>;
          if (typeof value.id !== 'string' || !jobsRef.current.some((job) => job.id === value.id)) {
            throw new Error('没有找到该职位。');
          }
          if (!validStages.includes(value.stage as JobStage)) throw new Error('stage 无效。');
          setJobs((current) =>
            current.map((job) =>
              job.id === value.id ? { ...job, stage: value.stage as JobStage } : job,
            ),
          );
          setActiveView('pipeline');
          return { id: value.id, stage: value.stage };
        },
      },
      {
        name: 'analyze_resume_match',
        title: '分析简历匹配度',
        description: '比较简历和职位描述，返回匹配分数、已覆盖能力和缺失能力。',
        inputSchema: {
          type: 'object',
          properties: {
            resume: { type: 'string', minLength: 30 },
            jobDescription: { type: 'string', minLength: 30 },
          },
          required: ['resume', 'jobDescription'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('输入必须是对象。');
          const value = input as Record<string, unknown>;
          if (typeof value.resume !== 'string' || value.resume.trim().length < 30) {
            throw new Error('resume 至少需要 30 个字符。');
          }
          if (typeof value.jobDescription !== 'string' || value.jobDescription.trim().length < 30) {
            throw new Error('jobDescription 至少需要 30 个字符。');
          }
          const result = analyzeResume(value.resume, value.jobDescription);
          setResume(value.resume);
          setJobDescription(value.jobDescription);
          setAnalysis(result);
          setActiveView('matcher');
          return result;
        },
      },
    ];

    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
      } catch {
        // Browsers without a complete experimental implementation may reject registration.
      }
    }

    return () => lifecycle.abort();
  }, []);

  const jobsByStage = useMemo(
    () =>
      Object.fromEntries(
        STAGES.map((stage) => [
          stage.id,
          jobs.filter((job) => job.stage === stage.id),
        ]),
      ) as Record<JobStage, Job[]>,
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) =>
      [job.company, job.role, job.location, job.nextStep].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [jobs, searchQuery]);

  const averageScore = jobs.length
    ? Math.round(jobs.reduce((total, job) => total + job.score, 0) / jobs.length)
    : 0;
  const progressedCount = jobs.filter((job) => ['interview', 'offer'].includes(job.stage)).length;
  const responseRate = jobs.length ? Math.round((progressedCount / jobs.length) * 100) : 0;
  const openTaskJobs = jobs
    .filter((job) => job.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const nextInterview = jobsByStage.interview[0];

  const selectedInterviewJob =
    jobs.find((job) => job.id === selectedInterviewJobId) ?? nextInterview ?? jobs[0];
  const interviewQuestions = selectedInterviewJob
    ? generateInterviewQuestions(selectedInterviewJob, analysis.missing)
    : [];
  const activeQuestion =
    interviewQuestions.find((question) => question.id === activeQuestionId) ?? interviewQuestions[0];
  const answerKey = selectedInterviewJob && activeQuestion
    ? `${selectedInterviewJob.id}:${activeQuestion.id}`
    : '';

  function addJobFromForm() {
    if (!newJob.company.trim() || !newJob.role.trim()) {
      announce('请填写公司和职位名称');
      return;
    }
    const job: Job = {
      id: `job-${Date.now()}`,
      company: newJob.company.trim(),
      role: newJob.role.trim(),
      location: newJob.location.trim() || '待确认',
      stage: newJob.stage,
      score: 70,
      createdAt: new Date().toISOString().slice(0, 10),
      nextStep: newJob.stage === 'saved' ? '完成职位匹配分析' : '安排下一次跟进',
    };
    setJobs((current) => [...current, job]);
    setNewJob({ company: '', role: '', location: '', stage: 'saved' });
    setDialogOpen(false);
    setActiveView('pipeline');
    announce(`${job.company} 已加入申请看板`);
  }

  function exportData() {
    const blob = new Blob([`\uFEFF${jobsToCsv(jobs)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jobloom-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    announce('申请数据已导出为 CSV');
  }

  function resetWorkspace() {
    setJobs(SEED_JOBS);
    setAnswers({});
    setCompletedTasks([]);
    setCompletedQuestions([]);
    setResume(DEFAULT_RESUME);
    setJobDescription(DEFAULT_JOB_DESCRIPTION);
    setAnalysis(analyzeResume(DEFAULT_RESUME, DEFAULT_JOB_DESCRIPTION));
    setAgentGoal('找出今天最该推进的机会，并给出可执行计划');
    setAgentRun(
      runCareerAgent(
        '找出今天最该推进的机会，并给出可执行计划',
        SEED_JOBS,
        analyzeResume(DEFAULT_RESUME, DEFAULT_JOB_DESCRIPTION),
      ),
    );
    setApprovedAgentTasks([]);
    announce('演示数据已恢复');
  }

  function renderAgent() {
    const metrics = [
      { label: '活跃申请', value: String(jobs.length), helper: `${jobsByStage.applied.length} 个等待回复`, icon: BriefcaseBusiness },
      { label: '平均匹配度', value: `${averageScore}%`, helper: averageScore >= 80 ? '整体质量良好' : '建议先做职位匹配', icon: Target },
      { label: '面试转化', value: `${responseRate}%`, helper: `${progressedCount} 个进入面试或 Offer`, icon: TrendingUp },
      { label: '待办事项', value: String(openTaskJobs.length), helper: `${completedTasks.length} 项已完成`, icon: CalendarClock },
    ];

    return (
      <>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,.88fr)]">
          <Card className="relative gap-0 overflow-hidden rounded-[24px] border-0 bg-[#0b1325] p-0 text-white shadow-[0_22px_55px_rgba(11,19,37,.18)]">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-[14px] bg-[#d8ff61] text-[#0b1325]">
                    <BrainCircuit className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Agent 指令</h2>
                    <p className="mt-0.5 text-[12px] text-slate-500">本地规划器 · 4 个可调用工具</p>
                  </div>
                </div>
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-[11px] text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> Ready
                </Badge>
              </div>

              <Label htmlFor="agent-goal" className="mt-7 block text-[12px] font-semibold text-slate-400">你希望 Agent 达成什么目标？</Label>
              <Textarea
                id="agent-goal"
                value={agentGoal}
                onChange={(event) => setAgentGoal(event.target.value)}
                className="mt-3 min-h-[112px] resize-none rounded-2xl border-white/10 bg-white/6 p-4 text-[15px] leading-6 text-white shadow-none placeholder:text-slate-600 focus-visible:border-[#d8ff61]/40 focus-visible:ring-[#d8ff61]/15"
                placeholder="例如：帮我提高本周的面试转化率…"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {['提高本周面试转化率', '先处理高匹配机会', '找出需要跟进的申请'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAgentGoal(preset)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="size-3.5" /> 只读分析 · 执行动作前需人工批准
                </p>
                <Button
                  className="rounded-xl bg-[#d8ff61] px-5 font-bold text-[#0b1325] hover:bg-[#c9f24f]"
                  onClick={runAgent}
                  disabled={agentStatus === 'running' || agentGoal.trim().length < 5}
                >
                  {agentStatus === 'running' ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
                  {agentStatus === 'running' ? 'Agent 正在规划' : '运行 Agent'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="gap-0 rounded-[24px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-[15px] font-bold text-[#0b1325]">工具调用轨迹</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">可解释的执行记录，不展示隐藏推理</p>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{agentRun.id}</span>
            </div>
            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {agentRun.actions.map((action, index) => {
                const completed = index < visibleAgentSteps;
                const active = agentStatus === 'running' && index === visibleAgentSteps;
                return (
                  <div key={action.id} className={`flex gap-3 py-3.5 transition ${completed || active ? 'opacity-100' : 'opacity-35'}`}>
                    <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${completed ? 'bg-emerald-50 text-emerald-600' : active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      {completed ? <Check className="size-3.5" /> : active ? <LoaderCircle className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-slate-700">{action.label}</p>
                        <code className="truncate text-[9px] text-blue-500">{action.tool}</code>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{action.detail}</p>
                      {completed ? <p className="mt-1 truncate text-[11px] font-medium text-slate-600">{action.result}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="mt-5 gap-0 overflow-hidden rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-blue-600" />
                <h2 className="text-[15px] font-bold text-[#0b1325]">Agent 行动计划</h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{agentRun.summary}</p>
            </div>
            <Button
              variant={agentRun.tasks.every((task) => approvedAgentTasks.includes(task.id)) ? 'secondary' : 'default'}
              className={`rounded-xl ${agentRun.tasks.every((task) => approvedAgentTasks.includes(task.id)) ? '' : 'bg-[#0b1325] text-white hover:bg-[#14203b]'}`}
              disabled={agentStatus === 'running'}
              onClick={() => {
                const allApproved = agentRun.tasks.every((task) => approvedAgentTasks.includes(task.id));
                setApprovedAgentTasks(allApproved ? [] : agentRun.tasks.map((task) => task.id));
                announce(allApproved ? '已撤回计划批准' : '行动计划已批准');
              }}
            >
              <CheckCircle2 className="size-4" />
              {agentRun.tasks.every((task) => approvedAgentTasks.includes(task.id)) ? '计划已批准' : '批准全部计划'}
            </Button>
          </div>
          <div className="flex gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-3.5 text-[12px] leading-5 text-blue-900 sm:px-6">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <span><strong>Agent 判断：</strong>{agentRun.insight}</span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            {agentRun.tasks.map((task, index) => {
              const approved = approvedAgentTasks.includes(task.id);
              return (
                <article key={task.id} className={`rounded-2xl border p-4 transition ${approved ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`border-0 text-[10px] ${task.priority === 'high' ? 'bg-rose-50 text-rose-700' : task.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      P{index + 1} · {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                    </Badge>
                    {approved ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
                  </div>
                  <h3 className="mt-3 text-[13px] font-semibold leading-5 text-[#0b1325]">{task.title}</h3>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{task.reason}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-[10px] text-slate-400">
                    <span>{task.company}</span>
                    <span className="flex items-center gap-1"><Clock3 className="size-3" />{task.estimate}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="gap-0 rounded-2xl border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(16,24,40,.04)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-[30px] font-bold leading-none tracking-[-0.04em] text-[#0b1325]">{metric.value}</p>
                  </div>
                  <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="size-[17px]" />
                  </div>
                </div>
                <p className="mt-4 text-[12px] font-medium text-slate-400">{metric.helper}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="min-w-0 gap-0 overflow-hidden rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-[16px] font-bold tracking-[-0.02em] text-[#0b1325]">申请进度</h2>
                <p className="mt-0.5 text-[12px] text-slate-400">共 {jobs.length} 个活跃机会</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg text-[13px] text-slate-500" onClick={() => setActiveView('pipeline')}>
                查看全部 <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
            <div className="overflow-x-auto bg-[#f8fafc]">
              <div className="grid min-w-[920px] grid-cols-4 gap-3 p-4 sm:p-5">
                {STAGES.map((stage) => (
                  <section key={stage.id} aria-label={`${stage.label}阶段`}>
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span className={`size-2 rounded-full ${stage.dot}`} />
                      <h3 className="text-[13px] font-semibold text-slate-700">{stage.label}</h3>
                      <span className="text-[12px] text-slate-400">{jobsByStage[stage.id].length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {jobsByStage[stage.id].slice(0, 2).map((job) => (
                        <JobCard key={job.id} job={job} onMove={moveJob} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-1">
            <Card className="gap-0 rounded-[22px] border-0 bg-[#0b1325] p-5 text-white shadow-[0_18px_45px_rgba(11,19,37,.16)]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-[#d8ff61] text-[#0b1325]">
                  <CalendarClock className="size-[18px]" />
                </div>
                <Badge className="border-white/10 bg-white/8 text-[11px] text-slate-300">下一场</Badge>
              </div>
              <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.12em] text-slate-500">面试安排</p>
              <h3 className="mt-2 text-[20px] font-bold tracking-[-0.03em]">
                {nextInterview ? `${nextInterview.company} · ${nextInterview.nextStep}` : '暂无面试'}
              </h3>
              <p className="mt-2 text-[13px] leading-5 text-slate-400">
                {nextInterview?.dueDate ? `${nextInterview.dueDate} · 60 分钟` : '把合适的职位推进到面试阶段'}
              </p>
              <Button className="mt-5 w-full rounded-xl bg-white text-[#0b1325] hover:bg-slate-100" onClick={() => setActiveView('interview')}>
                开始模拟面试 <ChevronRight className="size-4" />
              </Button>
            </Card>

            <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-400">今日重点</p>
                  <h3 className="mt-1 text-[16px] font-bold text-[#0b1325]">推进关键动作</h3>
                </div>
                <CircleUserRound className="size-5 text-slate-300" />
              </div>
              <div className="mt-5 space-y-3">
                {openTaskJobs.slice(0, 3).map((job) => {
                  const done = completedTasks.includes(job.id);
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() =>
                        setCompletedTasks((current) =>
                          done ? current.filter((id) => id !== job.id) : [...current, job.id],
                        )
                      }
                      className="flex w-full items-start gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                    >
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'}`}>
                        {done ? <Check className="size-3" /> : null}
                      </span>
                      <span>
                        <span className={`block text-[13px] leading-5 ${done ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}`}>{job.nextStep}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{job.company} · {job.dueDate}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  function renderMatcher() {
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[16px] font-bold text-[#0b1325]">职位匹配输入</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">粘贴真实内容，分析不会离开你的设备</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="self-start rounded-lg text-[12px] text-slate-500"
              onClick={() => {
                setResume(DEFAULT_RESUME);
                setJobDescription(DEFAULT_JOB_DESCRIPTION);
                announce('已载入演示文本');
              }}
            >
              <RotateCcw className="size-3.5" /> 演示文本
            </Button>
          </div>
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="resume" className="text-[13px] font-semibold text-slate-700">你的简历</Label>
                <span className="text-[11px] text-slate-400">{resume.length} 字符</span>
              </div>
              <Textarea
                id="resume"
                value={resume}
                onChange={(event) => setResume(event.target.value)}
                className="min-h-[430px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-4 text-[14px] leading-6 shadow-none focus-visible:bg-white"
                placeholder="粘贴简历内容…"
              />
            </div>
            <div className="p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="job-description" className="text-[13px] font-semibold text-slate-700">职位描述</Label>
                <span className="text-[11px] text-slate-400">{jobDescription.length} 字符</span>
              </div>
              <Textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                className="min-h-[430px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-4 text-[14px] leading-6 shadow-none focus-visible:bg-white"
                placeholder="粘贴职位描述…"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-[12px] text-slate-500">
              <ShieldCheck className="size-4 text-emerald-600" /> 本地关键词与证据分析 · 无网络请求
            </p>
            <Button
              className="rounded-xl bg-[#0b1325] px-5 text-white hover:bg-[#14203b]"
              disabled={resume.trim().length < 30 || jobDescription.trim().length < 30}
              onClick={runAnalysis}
            >
              <WandSparkles className="size-4" /> 分析匹配度
            </Button>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="gap-0 overflow-hidden rounded-[22px] border-0 bg-[#0b1325] p-0 text-white shadow-[0_18px_48px_rgba(11,19,37,.17)]">
            <div className="relative overflow-hidden p-6">
              <div className="absolute -right-16 -top-20 size-52 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative flex items-center gap-5">
                <div
                  className="grid size-[104px] shrink-0 place-items-center rounded-full p-[9px]"
                  style={{ background: `conic-gradient(#d8ff61 ${analysis.score * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}
                >
                  <div className="grid size-full place-items-center rounded-full bg-[#0b1325]">
                    <div className="text-center">
                      <p className="text-[30px] font-bold leading-none tracking-[-0.05em]">{analysis.score}</p>
                      <p className="mt-1 text-[11px] text-slate-500">匹配分</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Badge className="border-[#d8ff61]/20 bg-[#d8ff61]/10 text-[#d8ff61]">{analysis.score >= 88 ? '强匹配' : analysis.score >= 72 ? '可投递' : '需优化'}</Badge>
                  <p className="mt-3 text-[14px] leading-6 text-slate-300">{analysis.summary}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/8">
              <div className="border-r border-white/8 p-4 text-center">
                <p className="text-[22px] font-bold text-[#d8ff61]">{analysis.matched.length}</p>
                <p className="text-[11px] text-slate-500">已覆盖能力</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[22px] font-bold text-amber-300">{analysis.missing.length}</p>
                <p className="text-[11px] text-slate-500">待补充能力</p>
              </div>
            </div>
          </Card>

          <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <h3 className="text-[14px] font-bold text-[#0b1325]">能力覆盖</h3>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">已匹配</p>
              <div className="flex flex-wrap gap-2">
                {analysis.matched.length ? analysis.matched.map((skill) => (
                  <Badge key={skill} variant="secondary" className="border-0 bg-emerald-50 text-emerald-700">
                    <Check className="size-3" /> {skill}
                  </Badge>
                )) : <span className="text-[12px] text-slate-400">未识别到共同能力</span>}
              </div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">缺少证据</p>
              <div className="flex flex-wrap gap-2">
                {analysis.missing.length ? analysis.missing.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    <Plus className="size-3" /> {skill}
                  </Badge>
                )) : <span className="text-[12px] text-emerald-600">关键能力已全部覆盖</span>}
              </div>
            </div>
          </Card>

          <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-blue-600" />
              <h3 className="text-[14px] font-bold text-[#0b1325]">下一步优化</h3>
            </div>
            <ol className="mt-4 space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={suggestion} className="flex gap-3 text-[12px] leading-5 text-slate-600">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">{index + 1}</span>
                  {suggestion}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    );
  }

  function renderPipeline() {
    const stageJobs = (stage: JobStage) => filteredJobs.filter((job) => job.stage === stage);
    return (
      <Card className="gap-0 overflow-hidden rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-[13px] shadow-none"
              placeholder="搜索公司、职位或下一步…"
              aria-label="搜索职位"
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="清除搜索">
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <span>{filteredJobs.length} 个结果</span>
            <span className="h-4 w-px bg-slate-200" />
            <button type="button" onClick={exportData} className="flex items-center gap-1.5 font-medium text-slate-600 hover:text-[#0b1325]">
              <ArrowDownToLine className="size-3.5" /> 导出 CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto bg-[#f8fafc]">
          <div className="grid min-h-[610px] min-w-[1080px] grid-cols-4 gap-4 p-5">
            {STAGES.map((stage) => (
              <section key={stage.id} className={`rounded-2xl border border-slate-200/80 border-t-[3px] bg-slate-50/70 p-3 ${stage.accent}`} aria-label={`${stage.label}阶段`}>
                <div className="mb-4 flex items-center gap-2 px-1">
                  <span className={`size-2 rounded-full ${stage.dot}`} />
                  <h2 className="text-[13px] font-semibold text-slate-700">{stage.label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-400 shadow-sm">{stageJobs(stage.id).length}</span>
                  <button type="button" className="ml-auto text-slate-300 hover:text-slate-600" onClick={() => { setNewJob((current) => ({ ...current, stage: stage.id })); setDialogOpen(true); }} aria-label={`添加到${stage.label}`}>
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {stageJobs(stage.id).map((job) => <JobCard key={job.id} job={job} onMove={moveJob} />)}
                  {!stageJobs(stage.id).length ? (
                    <button type="button" onClick={() => { setNewJob((current) => ({ ...current, stage: stage.id })); setDialogOpen(true); }} className="flex w-full flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-9 text-center text-slate-400 hover:border-slate-300 hover:bg-white">
                      <Plus className="mb-2 size-5" />
                      <span className="text-[12px] font-medium">添加第一个机会</span>
                    </button>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function renderInterview() {
    if (!selectedInterviewJob || !activeQuestion) {
      return (
        <Card className="rounded-[22px] border-dashed p-10 text-center">
          <MessageSquareText className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 font-semibold">先添加一个职位，再开始训练</p>
        </Card>
      );
    }

    return (
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <Label className="text-[12px] font-semibold text-slate-500">训练职位</Label>
            <Select value={selectedInterviewJob.id} onValueChange={(value) => { if (value) { setSelectedInterviewJobId(value); setActiveQuestionId('project-story'); } }}>
              <SelectTrigger className="mt-3 h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>{job.company} · {job.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-4 rounded-2xl bg-[#0b1325] p-4 text-white">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">当前进度</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-[26px] font-bold tracking-[-0.04em]">{completedQuestions.length}/{interviewQuestions.length}</p>
                <p className="pb-1 text-[11px] text-slate-500">已练习</p>
              </div>
              <Progress value={(completedQuestions.length / interviewQuestions.length) * 100} className="mt-3 h-1.5 bg-white/10 [&>div]:bg-[#d8ff61]" />
            </div>
          </Card>

          <Card className="gap-2 rounded-[22px] border-slate-200/80 bg-white p-3 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            {interviewQuestions.map((question, index) => {
              const isActive = question.id === activeQuestion.id;
              const done = completedQuestions.includes(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveQuestionId(question.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${isActive ? 'bg-[#0b1325] text-white' : 'hover:bg-slate-50'}`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${done ? 'bg-emerald-500 text-white' : isActive ? 'bg-white/10 text-[#d8ff61]' : 'bg-slate-100 text-slate-500'}`}>
                    {done ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[11px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>{question.category}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium">{question.question}</span>
                  </span>
                </button>
              );
            })}
          </Card>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpenCheck className="size-[18px]" />
              </div>
              <div>
                <p className="text-[12px] text-slate-400">{activeQuestion.category}</p>
                <p className="text-[13px] font-semibold text-slate-700">{selectedInterviewJob.company} · {selectedInterviewJob.role}</p>
              </div>
            </div>
            <Badge variant="outline" className="hidden text-[11px] text-slate-500 sm:flex">
              <Clock3 className="size-3" /> 建议 3 分钟
            </Badge>
          </div>

          <div className="p-5 sm:p-7">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-blue-600">面试问题</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(22px,3vw,34px)] font-bold leading-[1.25] tracking-[-0.035em] text-[#0b1325]">
              {activeQuestion.question}
            </h2>
            <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-[13px] leading-6 text-blue-900">
              <Lightbulb className="mt-1 size-4 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold">回答提示</p>
                <p className="text-blue-800/70">{activeQuestion.cue}</p>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="interview-answer" className="text-[13px] font-semibold text-slate-700">你的回答草稿</Label>
                <span className="text-[11px] text-slate-400">自动保存</span>
              </div>
              <Textarea
                id="interview-answer"
                value={answers[answerKey] ?? ''}
                onChange={(event) => setAnswers((current) => ({ ...current, [answerKey]: event.target.value }))}
                className="min-h-[280px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-5 text-[14px] leading-7 shadow-none focus-visible:bg-white"
                placeholder="用具体情境、你的判断、采取的行动和结果来组织答案…"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-[12px] text-slate-400">答案只存储在当前浏览器中</p>
            <Button
              className={`rounded-xl ${completedQuestions.includes(activeQuestion.id) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0b1325] hover:bg-[#14203b]'} text-white`}
              onClick={() => {
                const done = completedQuestions.includes(activeQuestion.id);
                setCompletedQuestions((current) => done ? current.filter((id) => id !== activeQuestion.id) : [...current, activeQuestion.id]);
                announce(done ? '已取消练习标记' : '已标记为练习完成');
              }}
            >
              <CheckCircle2 className="size-4" />
              {completedQuestions.includes(activeQuestion.id) ? '已完成练习' : '标记为已练习'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  function renderAnalytics() {
    const weekly = [
      { label: '第 1 周', value: 1 },
      { label: '第 2 周', value: 3 },
      { label: '第 3 周', value: 2 },
      { label: '第 4 周', value: 5 },
      { label: '第 5 周', value: 4 },
      { label: '本周', value: Math.max(1, jobs.filter((job) => job.createdAt >= '2026-09-01').length) },
    ];
    const maxWeekly = Math.max(...weekly.map((item) => item.value), 1);
    const funnel = [
      { label: '全部机会', value: jobs.length, color: 'bg-slate-800' },
      { label: '完成投递', value: jobs.filter((job) => job.stage !== 'saved').length, color: 'bg-blue-500' },
      { label: '进入面试', value: progressedCount, color: 'bg-amber-400' },
      { label: '获得 Offer', value: jobsByStage.offer.length, color: 'bg-emerald-500' },
    ];

    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: '总机会数', value: jobs.length, suffix: '个', icon: BriefcaseBusiness },
            { label: '简历平均分', value: averageScore, suffix: '%', icon: Target },
            { label: '回复率', value: responseRate, suffix: '%', icon: MessageSquareText },
            { label: 'Offer 数', value: jobsByStage.offer.length, suffix: '个', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="gap-0 rounded-2xl border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(16,24,40,.04)]">
                <div className="flex items-center justify-between text-slate-400">
                  <p className="text-[13px] font-medium">{item.label}</p>
                  <Icon className="size-4" />
                </div>
                <p className="mt-4 text-[31px] font-bold tracking-[-0.045em] text-[#0b1325]">{item.value}<span className="ml-1 text-[14px] font-medium text-slate-400">{item.suffix}</span></p>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#0b1325]">近 6 周申请节奏</h2>
                <p className="mt-1 text-[12px] text-slate-400">稳定、高质量的投递比短期海投更有效</p>
              </div>
              <Badge variant="secondary" className="border-0 bg-emerald-50 text-emerald-700">节奏稳定</Badge>
            </div>
            <div className="mt-8 flex h-[260px] items-end gap-3 sm:gap-5">
              {weekly.map((item, index) => (
                <div key={item.label} className="flex h-full flex-1 flex-col justify-end">
                  <div className="group relative flex h-full items-end rounded-xl bg-slate-50 px-1.5 sm:px-3">
                    <div
                      className={`w-full rounded-t-lg transition-all ${index === weekly.length - 1 ? 'bg-[#0b1325]' : 'bg-blue-200 group-hover:bg-blue-300'}`}
                      style={{ height: `${Math.max(16, (item.value / maxWeekly) * 88)}%` }}
                    >
                      <span className={`mx-auto mt-2 block text-center text-[11px] font-bold ${index === weekly.length - 1 ? 'text-[#d8ff61]' : 'text-blue-700'}`}>{item.value}</span>
                    </div>
                  </div>
                  <p className="mt-3 truncate text-center text-[11px] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="gap-0 rounded-[22px] border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
            <h2 className="text-[16px] font-bold text-[#0b1325]">申请漏斗</h2>
            <p className="mt-1 text-[12px] text-slate-400">定位损耗最大的环节</p>
            <div className="mt-7 space-y-5">
              {funnel.map((item, index) => {
                const width = jobs.length ? Math.max(12, (item.value / jobs.length) * 100) : 0;
                const previous = index ? funnel[index - 1].value : item.value;
                const conversion = previous ? Math.round((item.value / previous) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="text-slate-400">{item.value} {index ? `· ${conversion}%` : ''}</span>
                    </div>
                    <div className="h-9 overflow-hidden rounded-xl bg-slate-100">
                      <div className={`grid h-full place-items-center rounded-xl text-[11px] font-bold text-white transition-all ${item.color}`} style={{ width: `${width}%` }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[22px] border-slate-200/80 bg-white p-0 shadow-[0_12px_40px_rgba(16,24,40,.045)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-[16px] font-bold text-[#0b1325]">机会质量排行</h2>
            <p className="mt-1 text-[12px] text-slate-400">优先投入匹配度高、阶段靠前的机会</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.06em] text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">公司与职位</th>
                  <th className="px-4 py-3 font-semibold">阶段</th>
                  <th className="px-4 py-3 font-semibold">匹配度</th>
                  <th className="px-4 py-3 font-semibold">下一步</th>
                  <th className="px-6 py-3 text-right font-semibold">截止日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...jobs].sort((a, b) => b.score - a.score).slice(0, 6).map((job) => (
                  <tr key={job.id} className="text-[13px] hover:bg-slate-50/70">
                    <td className="px-6 py-4" aria-label={`${job.company} ${job.role}`}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-[#0b1325] text-[11px] font-bold text-white">{companyInitials(job.company)}</span>
                        <div>
                          <p className="font-semibold text-slate-800">{job.company}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{job.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Badge variant="secondary" className="border-0 text-[11px]">{stageLabel(job.stage)}</Badge></td>
                    <td className="px-4 py-4 font-semibold text-emerald-700">{job.score}%</td>
                    <td className="px-4 py-4 text-slate-600">{job.nextStep}</td>
                    <td className="px-6 py-4 text-right text-slate-400">{job.dueDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  const meta = viewMeta[activeView];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="hidden w-[264px] shrink-0 flex-col bg-[#0b1325] px-5 py-6 text-slate-200 lg:flex">
          <button type="button" onClick={() => setActiveView('agent')} className="flex items-center gap-3 px-2 text-left">
            <div className="grid size-10 place-items-center rounded-[14px] bg-[#d8ff61] text-[#0b1325] shadow-[0_10px_28px_rgba(216,255,97,.2)]">
              <Sparkles className="size-5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[18px] font-bold tracking-[-0.03em] text-white">Jobloom Agent</p>
              <p className="text-[12px] text-slate-500">本地优先求职智能体</p>
            </div>
          </button>

          <nav className="mt-10 space-y-1" aria-label="主导航">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeView;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-medium transition-colors ${active ? 'bg-white text-[#0b1325] shadow-sm' : 'text-slate-400 hover:bg-white/6 hover:text-white'}`}
                >
                  <Icon className="size-[18px]" />
                  <span>{item.label}</span>
                  {item.id === 'pipeline' ? (
                    <span className="ml-auto rounded-full bg-[#d8ff61] px-2 py-0.5 text-[11px] font-bold text-[#0b1325]">{jobs.length}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <Card className="border-white/8 bg-white/5 p-4 text-slate-300 shadow-none">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-white">
                <Target className="size-4 text-[#d8ff61]" /> 本周目标
              </div>
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-400">
                <span>推进 5 个机会</span>
                <span>{Math.min(progressedCount, 5)} / 5</span>
              </div>
              <Progress value={(Math.min(progressedCount, 5) / 5) * 100} className="h-1.5 bg-white/10 [&>div]:bg-[#d8ff61]" />
            </Card>
            <button type="button" onClick={resetWorkspace} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] text-slate-400 hover:bg-white/6 hover:text-white">
              <Settings className="size-[18px]" /> 恢复演示数据
            </button>
            <div className="mt-3 flex items-center gap-3 border-t border-white/8 px-2 pt-5">
              <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-[13px] font-bold text-white">LR</div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">林然</p>
                <p className="truncate text-[12px] text-slate-500">数据仅保存在本机</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-7 lg:px-10 lg:pb-10 lg:pt-7">
          <header className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
            <button type="button" onClick={() => setActiveView('agent')} className="flex items-center gap-3 lg:hidden">
              <div className="grid size-9 place-items-center rounded-xl bg-[#0b1325] text-[#d8ff61]"><Sparkles className="size-4" /></div>
              <span className="font-bold">Jobloom Agent</span>
            </button>
            <p className="hidden text-[13px] font-medium text-muted-foreground lg:block">{todayLabel}</p>
            <div className="ml-auto flex items-center gap-2">
              <div className={`overflow-hidden transition-all ${searchOpen ? 'w-[180px] sm:w-[260px]' : 'w-0'}`}>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setActiveView('pipeline');
                    if (event.key === 'Escape') setSearchOpen(false);
                  }}
                  className="h-9 rounded-xl border-slate-200 bg-white text-[13px]"
                  placeholder="搜索职位…"
                  aria-label="全局搜索"
                />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl bg-white" onClick={() => setSearchOpen((current) => !current)} aria-label="搜索">
                {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
              </Button>
              <Button className="rounded-xl bg-[#0b1325] px-4 text-white hover:bg-[#14203b]" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /><span className="hidden sm:inline">添加职位</span>
              </Button>
            </div>
          </header>

          <div className="py-7">
            <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-blue-600"><Sparkles className="size-4" />{meta.eyebrow}</p>
                <h1 className="max-w-4xl text-[clamp(28px,3vw,42px)] font-bold leading-[1.08] tracking-[-0.045em] text-[#0b1325]">{meta.title}</h1>
                <p className="mt-2 text-[13px] text-slate-400">{meta.description}</p>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500" />所有更改已保存</div>
            </div>

            {activeView === 'agent' && renderAgent()}
            {activeView === 'matcher' && renderMatcher()}
            {activeView === 'pipeline' && renderPipeline()}
            {activeView === 'interview' && renderInterview()}
            {activeView === 'analytics' && renderAnalytics()}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0b1325]/95 p-2 text-slate-400 shadow-[0_16px_50px_rgba(11,19,37,.3)] backdrop-blur-xl lg:hidden" aria-label="移动端导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${active ? 'bg-white/10 text-[#d8ff61]' : 'hover:text-white'}`}>
              <Icon className="size-[18px]" /><span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-[22px] p-5 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold tracking-[-0.03em] text-[#0b1325]">添加求职机会</DialogTitle>
            <DialogDescription>先记录基本信息，之后可以继续补充匹配度和下一步。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="company">公司 *</Label>
              <Input id="company" value={newJob.company} onChange={(event) => setNewJob((current) => ({ ...current, company: event.target.value }))} className="h-11 rounded-xl" placeholder="例如：OpenAI" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">职位 *</Label>
              <Input id="role" value={newJob.role} onChange={(event) => setNewJob((current) => ({ ...current, role: event.target.value }))} className="h-11 rounded-xl" placeholder="例如：Product Designer" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="location">地点</Label>
                <Input id="location" value={newJob.location} onChange={(event) => setNewJob((current) => ({ ...current, location: event.target.value }))} className="h-11 rounded-xl" placeholder="城市或远程" />
              </div>
              <div className="grid gap-2">
                <Label>当前阶段</Label>
                <Select value={newJob.stage} onValueChange={(value) => value && setNewJob((current) => ({ ...current, stage: value as JobStage }))}>
                  <SelectTrigger className="h-11 w-full rounded-xl px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="-mx-5 -mb-5 mt-2 px-5 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0b1325] text-white hover:bg-[#14203b]" onClick={addJobFromForm}><Plus className="size-4" />添加到看板</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {notice ? (
        <output aria-live="polite" className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#0b1325] px-4 py-2.5 text-[13px] font-medium text-white shadow-xl lg:bottom-7">
          <CheckCircle2 className="size-4 text-[#d8ff61]" />{notice}
        </output>
      ) : null}
    </main>
  );
}
