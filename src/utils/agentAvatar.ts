import type { LedgerAgent } from '../mock/ledger';

const STORAGE_PREFIX = 'ledger-agent-avatar:';
const PALETTES = [
  ['#1677ff', '#36cfc9'],
  ['#722ed1', '#2f54eb'],
  ['#08979c', '#52c41a'],
  ['#d46b08', '#fa8c16'],
  ['#c41d7f', '#9254de'],
  ['#0958d9', '#13c2c2'],
];

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);

export const generateAgentAvatar = (agent: Pick<LedgerAgent, 'name' | 'description' | 'type'>, prompt = '') => {
  const seed = `${agent.description || agent.name}-${prompt || agent.type}`;
  const index = hashText(seed) % PALETTES.length;
  const [start, end] = PALETTES[index];
  const mark = /影像|CT|MRI|超声/.test(seed) ? '✦' : /药|治疗/.test(seed) ? '✚' : /问诊|导诊/.test(seed) ? '✧' : 'AI';
  const shortName = escapeXml(agent.name.slice(0, 4));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/>
        </linearGradient>
        <radialGradient id="shine" cx="30%" cy="20%" r="75%">
          <stop stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="320" height="320" rx="86" fill="url(#g)"/>
      <circle cx="160" cy="142" r="84" fill="#fff" fill-opacity=".13" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
      <circle cx="126" cy="139" r="9" fill="#fff"/><circle cx="194" cy="139" r="9" fill="#fff"/>
      <path d="M122 178 Q160 205 198 178" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <text x="160" y="90" text-anchor="middle" fill="#fff" font-size="34" font-weight="700">${mark}</text>
      <rect width="320" height="320" rx="86" fill="url(#shine)"/>
      <rect x="58" y="248" width="204" height="42" rx="21" fill="#081b33" fill-opacity=".25"/>
      <text x="160" y="276" text-anchor="middle" fill="#fff" font-size="20" font-family="sans-serif" font-weight="600">${shortName}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getAgentAvatar = (agent: Pick<LedgerAgent, 'id' | 'name' | 'description' | 'type'>) => {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${agent.id}`) || generateAgentAvatar(agent);
  } catch {
    return generateAgentAvatar(agent);
  }
};

export const saveAgentAvatar = (agentId: string, dataUrl: string) => {
  localStorage.setItem(`${STORAGE_PREFIX}${agentId}`, dataUrl);
};

export const resetAgentAvatar = (agentId: string) => {
  localStorage.removeItem(`${STORAGE_PREFIX}${agentId}`);
};
