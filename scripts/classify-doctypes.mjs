import { writeFile } from 'node:fs/promises'
import { loadReferenceMetadata } from '../server/engine/reference-metadata.js'
import { buildRegistry } from '../server/engine/registry.js'
const registry = buildRegistry(await loadReferenceMetadata())
await writeFile(new URL('../metadata/registration-manifest.json',import.meta.url),
  JSON.stringify({ version:registry.version,sourceChecksum:registry.sourceChecksum,types:registry.manifest },null,2) + '\n')
console.log(registry.manifest.length + ' classified, ' + registry.registered.size + ' registered.')
