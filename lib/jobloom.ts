export type JobStage = 'saved' | 'applied' | 'interview' | 'offer';

export type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  stage: JobStage;
  score: number;
  createdAt: string;
  nextStep: string;
  dueDate?: string;
  notes?: string;
  salary?: string;
};

export type MatchAnalysis = {
  score: number;
  matched: string[];
  missing: string[];
  suggestions: string[];
  summary: string;
};

export const STAGES: Array<{
  id: JobStage;
  label: string;
  dot: string;
  accent: string;
}> = [
  { id: 'saved', label: '收藏', dot: 'bg-slate-400', accent: 'border-t-slate-400' },
  { id: 'applied', label: '已申请', dot: 'bg-blue-500', accent: 'border-t-blue-500' },
  { id: 'interview', label: '面试中', dot: 'bg-amber-400', accent: 'border-t-amber-400' },
  { id: 'offer', label: 'Offer', dot: 'bg-emerald-500', accent: 'border-t-emerald-500' },
];

export const SEED_JOBS: Job[] = [
  {
    id: 'linear-product-designer',
    company: 'Linear',
    role: 'Product Designer',
    location: '上海 · 混合办公',
    stage: 'saved',
    score: 88,
    createdAt: '2026-09-08',
    nextStep: '完成定制简历',
    dueDate: '2026-09-11',
    salary: '¥45k–60k/月',
    notes: '强调复杂 B2B 工作流和设计系统经验。',
  },
  {
    id: 'figma-product-designer-ai',
    company: 'Figma',
    role: 'Product Designer, AI',
    location: '远程',
    stage: 'saved',
    score: 82,
    createdAt: '2026-09-06',
    nextStep: '补充 AI 产品案例',
    dueDate: '2026-09-13',
    salary: '$155k–210k',
  },
  {
    id: 'framer-product-designer',
    company: 'Framer',
    role: 'Senior Product Designer',
    location: '远程 · 欧洲时区',
    stage: 'saved',
    score: 76,
    createdAt: '2026-09-03',
    nextStep: '确认时区要求',
  },
  {
    id: 'airbnb-staff-product-designer',
    company: 'Airbnb',
    role: 'Staff Product Designer',
    location: '北京 · 混合办公',
    stage: 'saved',
    score: 71,
    createdAt: '2026-09-02',
    nextStep: '梳理跨团队影响力案例',
  },
  {
    id: 'stripe-senior-product-designer',
    company: 'Stripe',
    role: 'Senior Product Designer',
    location: '新加坡 · 混合办公',
    stage: 'applied',
    score: 91,
    createdAt: '2026-09-07',
    nextStep: '跟进招聘团队',
    dueDate: '2026-09-10',
    salary: 'S$180k–230k',
  },
  {
    id: 'arc-product-designer',
    company: 'The Browser Company',
    role: 'Product Designer',
    location: '远程',
    stage: 'applied',
    score: 79,
    createdAt: '2026-09-05',
    nextStep: '等待作品集评审',
  },
  {
    id: 'wise-product-designer',
    company: 'Wise',
    role: 'Product Designer — Growth',
    location: '新加坡',
    stage: 'applied',
    score: 84,
    createdAt: '2026-09-04',
    nextStep: '准备增长实验案例',
    dueDate: '2026-09-14',
  },
  {
    id: 'notion-product-designer',
    company: 'Notion',
    role: 'Product Designer',
    location: '旧金山 · 混合办公',
    stage: 'interview',
    score: 94,
    createdAt: '2026-08-28',
    nextStep: '产品设计二面',
    dueDate: '2026-09-10',
    salary: '$190k–260k',
    notes: '重点准备从模糊问题到可验证方案的完整过程。',
  },
  {
    id: 'vercel-design-engineer',
    company: 'Vercel',
    role: 'Design Engineer',
    location: '远程',
    stage: 'interview',
    score: 86,
    createdAt: '2026-09-01',
    nextStep: '招聘经理初面',
    dueDate: '2026-09-11',
  },
  {
    id: 'raycast-product-designer',
    company: 'Raycast',
    role: 'Product Designer',
    location: '远程 · 欧洲时区',
    stage: 'offer',
    score: 90,
    createdAt: '2026-08-20',
    nextStep: '等待最终薪酬方案',
    dueDate: '2026-09-12',
    salary: '€105k–130k',
  },
];

export const DEFAULT_RESUME = `林然 · 产品设计师
6 年 B2B SaaS 与协作工具设计经验，擅长将复杂工作流转化为清晰、可扩展的产品体验。

核心能力
Product strategy, interaction design, user research, prototyping, Figma, design systems, data analysis, usability testing, cross-functional collaboration, accessibility

经历亮点
• 主导企业协作产品从 0 到 1，访谈 40+ 用户并将任务完成率提升 32%。
• 建立覆盖 8 条产品线的设计系统，使交付效率提升 45%。
• 与产品、工程和数据团队合作，通过 A/B testing 将激活率提升 18%。`;

export const DEFAULT_JOB_DESCRIPTION = `Notion is looking for a Product Designer to shape intelligent collaboration experiences.

You will lead end-to-end product design, partner with product managers and engineers, conduct user research, prototype in Figma, and evolve our design system. The ideal candidate communicates a clear product strategy, uses data to validate decisions, and has experience with AI products, experimentation, accessibility, and motion design.`;

const SKILLS = [
  { label: '产品策略', aliases: ['product strategy', '产品策略'] },
  { label: '交互设计', aliases: ['interaction design', '交互设计'] },
  { label: '用户研究', aliases: ['user research', '用户研究', '用户访谈'] },
  { label: '原型设计', aliases: ['prototype', 'prototyping', '原型'] },
  { label: 'Figma', aliases: ['figma'] },
  { label: '设计系统', aliases: ['design system', '设计系统'] },
  { label: '数据分析', aliases: ['data analysis', 'analytics', '数据分析'] },
  { label: '可用性测试', aliases: ['usability testing', '可用性测试'] },
  { label: '跨职能协作', aliases: ['cross-functional', '跨职能', '跨团队'] },
  { label: '无障碍设计', aliases: ['accessibility', 'a11y', '无障碍'] },
  { label: 'AI 产品', aliases: ['ai product', 'ai products', '人工智能产品', 'ai 产品'] },
  { label: 'A/B 测试', aliases: ['a/b test', 'experimentation', '实验设计'] },
  { label: '动效设计', aliases: ['motion design', 'animation', '动效'] },
  { label: '增长设计', aliases: ['growth design', 'growth', '增长设计'] },
  { label: 'SQL', aliases: ['sql'] },
  { label: 'React', aliases: ['react'] },
  { label: '领导力', aliases: ['leadership', 'lead ', '领导力', '主导'] },
];

function includesAlias(text: string, aliases: string[]) {
  const normalized = text.toLowerCase();
  return aliases.some((alias) => normalized.includes(alias.toLowerCase()));
}

export function analyzeResume(resume: string, description: string): MatchAnalysis {
  const requiredSkills = SKILLS.filter((skill) => includesAlias(description, skill.aliases));
  const matched = requiredSkills.filter((skill) => includesAlias(resume, skill.aliases)).map((skill) => skill.label);
  const missing = requiredSkills.filter((skill) => !includesAlias(resume, skill.aliases)).map((skill) => skill.label);
  const coverage = requiredSkills.length ? matched.length / requiredSkills.length : 0.55;
  const evidenceSignals = ['%', '提升', '增长', '降低', '用户', '团队'].filter((signal) => resume.includes(signal)).length;
  const structureBonus = Math.min(8, Math.round((resume.length / 450) * 4) + Math.min(evidenceSignals, 4));
  const score = Math.max(36, Math.min(97, Math.round(42 + coverage * 49 + structureBonus)));

  const suggestions: string[] = [];
  if (missing.length) {
    suggestions.push(`优先补充 ${missing.slice(0, 3).join('、')} 的真实项目证据，不要只堆关键词。`);
  }
  if (!/[0-9]+%/.test(resume)) {
    suggestions.push('为至少两条经历加入可验证的结果数字，例如转化率、效率或采用率。');
  }
  if (!/主导|负责|led|owned/i.test(resume)) {
    suggestions.push('明确写出你的职责边界与决策影响，帮助招聘方判断资深程度。');
  }
  suggestions.push('把最相关的案例移到首位，并在开头两行复用职位描述中的业务语境。');

  return {
    score,
    matched,
    missing,
    suggestions: suggestions.slice(0, 3),
    summary:
      score >= 88
        ? '核心能力与职位高度吻合，下一步应强化差异化案例与业务影响。'
        : score >= 72
          ? '基础匹配良好，但仍有几项关键能力缺少直接证据。'
          : '目前的简历表达与岗位重点存在明显间距，建议先重排内容再投递。',
  };
}

export function generateInterviewQuestions(job: Job, missingSkills: string[] = []) {
  const gap = missingSkills[0] ?? '陌生领域';
  return [
    {
      id: 'project-story',
      category: '项目复盘',
      question: `挑一个最能代表你能力的项目。你如何定义问题、做出关键取舍，并衡量最终结果？`,
      cue: '建议用 STAR：背景 → 目标 → 关键行动 → 可量化结果。',
    },
    {
      id: 'company-fit',
      category: '岗位动机',
      question: `为什么是 ${job.company}，以及为什么是现在？`,
      cue: `连接 ${job.company} 的产品阶段、你的经历和下一步成长目标。`,
    },
    {
      id: 'ambiguity',
      category: '问题解决',
      question: `讲一次你面对高度模糊需求的经历。你如何把它变成团队可以执行的方向？`,
      cue: '不要只讲流程，说明你如何改变了团队原先的判断。',
    },
    {
      id: 'gap',
      category: '能力补位',
      question: `这个岗位重视“${gap}”。请举例说明你如何快速补齐类似能力。`,
      cue: '诚实承认边界，再用学习速度和迁移能力给出证据。',
    },
    {
      id: 'conflict',
      category: '协作影响',
      question: `当产品、设计和工程对方向有分歧时，你如何推动决策？`,
      cue: '描述冲突本身、你引入的证据，以及团队最终如何承诺。',
    },
    {
      id: 'role-plan',
      category: '入职计划',
      question: `如果加入 ${job.company} 担任 ${job.role}，你会如何安排前 30 天？`,
      cue: '覆盖关系建立、用户理解、产品脉络和第一个可交付成果。',
    },
  ];
}

export function jobsToCsv(jobs: Job[]) {
  const header = ['Company', 'Role', 'Location', 'Stage', 'Match score', 'Created at', 'Next step', 'Due date', 'Salary'];
  const quote = (value: string | number | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [
    header.map(quote).join(','),
    ...jobs.map((job) =>
      [job.company, job.role, job.location, job.stage, job.score, job.createdAt, job.nextStep, job.dueDate, job.salary]
        .map(quote)
        .join(','),
    ),
  ].join('\n');
}
