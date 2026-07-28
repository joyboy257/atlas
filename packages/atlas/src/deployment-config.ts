import path from 'node:path';
import { parse } from 'yaml';
import { readUtf8Safe, sha256 } from './fs-safety.js';
import { AtlasCliError } from './errors.js';
export async function validateAtlasConfig(root: string, file = 'atlas.yaml') {
  const filePath = path.resolve(root, file); const raw = await readUtf8Safe(filePath); if (raw === null) throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas configuration not found: ${filePath}`);
  let value: unknown; try { value = parse(raw); } catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'atlas.yaml is not valid YAML'); }
  const errors: string[] = []; const config = value as Record<string, unknown>;
  if (!config || typeof config !== 'object' || Array.isArray(config)) errors.push('configuration must be an object');
  if (config?.apiVersion !== 'atlas.mirai/v1') errors.push('apiVersion must be atlas.mirai/v1'); if (config?.kind !== 'Project') errors.push('kind must be Project');
  const metadata = config?.metadata as Record<string, unknown> | undefined; if (typeof metadata?.name !== 'string' || !metadata.name) errors.push('metadata.name is required');
  const spec = config?.spec as Record<string, unknown> | undefined; if (typeof spec?.projectId !== 'string' || !spec.projectId) errors.push('spec.projectId is required'); if (!spec?.environments || typeof spec.environments !== 'object' || Array.isArray(spec.environments)) errors.push('spec.environments must be an object');
  if (Buffer.byteLength(raw, 'utf8') > 256_000) errors.push('configuration exceeds 256KB');
  scanForSecrets(value, '', 0, errors);
  return { valid: errors.length === 0, errors, file_path: filePath, config_digest: sha256(stableJson(value)), config: value };
}
export async function planDeployment(root: string, file = 'atlas.yaml') { const validation = await validateAtlasConfig(root, file); return { ...validation, actions: validation.valid ? [{ type: 'create_immutable_revision', digest: validation.config_digest }, { type: 'deploy_environment_revision', requires_explicit_apply: true }] : [], destructive: false }; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; return JSON.stringify(value); }
function scanForSecrets(value:unknown,pathName:string,depth:number,errors:string[]){if(depth>12){errors.push(`configuration depth exceeds 12 at ${pathName||'root'}`);return;}if(Array.isArray(value)){value.forEach((item,index)=>scanForSecrets(item,`${pathName}[${index}]`,depth+1,errors));return;}if(value&&typeof value==='object'){for(const[key,item]of Object.entries(value as Record<string,unknown>)){const next=pathName?`${pathName}.${key}`:key;if(/(password|secret|access[_-]?token|refresh[_-]?token|private[_-]?key|api[_-]?key)/i.test(key)&&!/(ref|reference)$/i.test(key))errors.push(`inline secret field is forbidden: ${next}`);scanForSecrets(item,next,depth+1,errors);}return;}if(typeof value==='string'&&(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)||/^Bearer\s+/i.test(value)||/^(sk|pk)_(live|test)_/i.test(value)))errors.push(`inline credential material is forbidden: ${pathName}`);}
