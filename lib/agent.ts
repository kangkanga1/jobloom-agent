import type { Job, MatchAnalysis } from './jobloom';

export type AgentToolName =
  | 'inspect_pipeline'
  | 'rank_opportunities'
  | 'analyze_resume_gaps'
  | 'build_action_plan';

export type AgentAction = {
  id: string;
  tool: AgentToolName;
  label: string;
  detail: string;
  result: string;
};

export type AgentTask = {
  id: string;
  jobId: string;
  title: string;
  company: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimate: string;
};

export type AgentRun = {
  id: string;
  goal: string;
  createdAt: string;
  summary: string;
  actions: AgentAction[];
  tasks: AgentTask[];
  insight: string;
};

export const AGENT_TOOLS: Array<{
  name: AgentToolName;
  title: string;
  description: string;
}> = [
  {
    name: 'inspect_pipeline',
    title: '读取申请漏斗',
    description: '汇总各阶段职位、截止日期和停滞机会。',
  },
  {
    name: 'rank_opportunities',
    title: '机会优先级排序',
    description: '按阶段、匹配度和紧迫性计算下一步优先级。',
  },
  {
    name: 'analyze_resume_gaps',
    title: '识别简历缺口',
    description: '读取最近一次职位匹配结果，定位缺失证据。',
  },
  {
    name: 'build_action_plan',
    title: '生成行动计划',
    description: '把分析结果转成需要人工确认的具体任务。',
  },
];

const stageWeight: Record<Job['stage'], number> = {
  saved: 1,
  applied: 2,
  interview: 4,
  offer: 3,
};

function priorityScore(job: Job, goal: string) {
  let score = stageWeight[job.stage] * 24 + job.score * 0.55;
  if (job.dueDate) score += 14;
  if (/面试|interview/i.test(goal) && job.stage === 'interview') score += 28;
  if (/简历|匹配|resume/i.test(goal) && job.stage === 'saved') score += 22;
  if (/offer|选择|薪酬/i.test(goal) && job.stage === 'offer') score += 28;
  if (/跟进|回复|follow/i.test(goal) && job.stage === 'applied') score += 22;
  return score;
}

function taskForJob(job: Job, rank: number): AgentTask {
  const titleByStage: Record<Job['stage'], string> = {
    saved: `为 ${job.company} 定制简历并确认投递`,
    applied: `跟进 ${job.company} 的申请进度`,
    interview: `完成 ${job.company} 面试演练`,
    offer: `整理 ${job.company} Offer 决策清单`,
  };
  const reasonByStage: Record<Job['stage'], string> = {
    saved: `匹配度 ${job.score}%，先补齐证据再投递能提高有效申请率。`,
    applied: `申请已提交，主动跟进能避免高质量机会停滞。`,
    interview: `已进入面试阶段，准备质量对结果影响最大。`,
    offer: `已接近最终决策，需要系统比较薪酬、成长和风险。`,
  };

  return {
    id: `agent-task-${job.id}`,
    jobId: job.id,
    title: titleByStage[job.stage],
    company: job.company,
    priority: rank === 0 ? 'high' : rank < 3 ? 'medium' : 'low',
    reason: reasonByStage[job.stage],
    estimate: job.stage === 'interview' ? '35 分钟' : job.stage === 'saved' ? '25 分钟' : '15 分钟',
  };
}

export function runCareerAgent(
  goal: string,
  jobs: Job[],
  analysis: MatchAnalysis,
  now = new Date().toISOString(),
): AgentRun {
  const normalizedGoal = goal.trim() || '找出今天最值得推进的求职机会';
  const ranked = [...jobs].sort(
    (left, right) => priorityScore(right, normalizedGoal) - priorityScore(left, normalizedGoal),
  );
  const topJobs = ranked.slice(0, Math.min(4, ranked.length));
  const interviewCount = jobs.filter((job) => job.stage === 'interview').length;
  const stalledCount = jobs.filter((job) => job.stage === 'applied').length;
  const topNames = topJobs.slice(0, 3).map((job) => job.company).join('、') || '暂无机会';
  const gapSummary = analysis.missing.length
    ? analysis.missing.slice(0, 3).join('、')
    : '没有明显的核心能力缺口';
  const tasks = topJobs.map(taskForJob);

  return {
    id: `agent-run-${now.replace(/[^0-9]/g, '').slice(0, 14)}`,
    goal: normalizedGoal,
    createdAt: now,
    summary: `已检查 ${jobs.length} 个机会，选出 ${tasks.length} 个今天最值得推进的动作。`,
    insight:
      interviewCount > 0
        ? `面试阶段的机会价值最高；先准备 ${ranked.find((job) => job.stage === 'interview')?.company ?? topJobs[0]?.company ?? '当前面试'}，再处理等待回复的申请。`
        : `当前还没有面试机会，优先提高高匹配职位的投递质量，并保持有节奏的跟进。`,
    actions: [
      {
        id: 'inspect',
        tool: 'inspect_pipeline',
        label: '读取申请漏斗',
        detail: '检查阶段、截止日期和停滞状态',
        result: `${jobs.length} 个机会 · ${interviewCount} 个面试中 · ${stalledCount} 个等待回复`,
      },
      {
        id: 'rank',
        tool: 'rank_opportunities',
        label: '计算机会优先级',
        detail: '综合阶段价值、匹配度和时间紧迫性',
        result: `优先关注：${topNames}`,
      },
      {
        id: 'gaps',
        tool: 'analyze_resume_gaps',
        label: '复用简历诊断',
        detail: '读取最近一次职位匹配结果',
        result: `当前匹配分 ${analysis.score}；需要补充：${gapSummary}`,
      },
      {
        id: 'plan',
        tool: 'build_action_plan',
        label: '生成可执行计划',
        detail: '把判断转换为需要人工批准的任务',
        result: `生成 ${tasks.length} 项任务，预计总耗时 ${tasks.length * 20}–${tasks.length * 30} 分钟`,
      },
    ],
    tasks,
  };
}
