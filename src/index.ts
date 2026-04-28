import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as prompts from '@clack/prompts'
import { determineAgent } from '@vercel/detect-agent'
import mri from 'mri'

import { createColors, type ColorFunc } from './create-color.ts'
import { formatTargetDir, isEmptyDir, emptyDir } from './dir-utils.ts'
import { pkgFromUserAgent } from './pkg-from-user-agent.ts'
import { isValidPackageName, toValidPackageName } from './valid-package-name.ts'
import { write } from './write.ts'

const { green } = createColors()

// prettier-ignore
const helpMessage = `\
Usage: create-home [OPTION]... [DIRECTORY]

Create a new Home project in TypeScript.

Options:
  -t, --template NAME                   use a specific template

Available templates:
${green     ('openapi             Base OpenAPI'           )}
${green     ('openapi-mongo       OpenAPI with MongoDB'   )}`

type Template = {
  name: string
  display: string
  color: ColorFunc
  variants: FrameworkVariant[]
}
type FrameworkVariant = {
  name: string
  display: string
  color: ColorFunc
}
const TEMPLATES: Template[] = [
  {
    name: 'openapi',
    display: 'OpenAPI',
    color: green,
    variants: [
      {
        name: 'openapi',
        display: 'Base OpenAPI',
        color: green,
      },
      {
        name: 'openapi-mongo',
        display: 'OpenAPI with mongoDB',
        color: green,
      },
    ],
  },
]

const argv = mri<{
  help?: boolean
  overwrite?: boolean
  interactive?: boolean
  template?: string
}>(process.argv.slice(2), {
  boolean: ['help', 'overwrite', 'interactive'],
  string: ['template'],
  alias: { h: 'help', t: 'template' },
})

const cwd = process.cwd()

async function init() {
  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  const argInteractive = argv.interactive
  const interactive = argInteractive ?? process.stdin.isTTY

  const { isAgent } = await determineAgent()
  if (isAgent && interactive) {
    console.log(
      '\nTo create in one go, run: create-home <DIRECTORY> --no-interactive --template <TEMPLATE>\n',
    )
  }

  const cancel = () => prompts.cancel('Operation cancelled')

  // 1. Get project name and target dir
  const defaultTargetDir = 'home-project'
  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
    : undefined
  let targetDir = argTargetDir
  if (!targetDir) {
    if (interactive) {
      const projectName = await prompts.text({
        message: 'Project name:',
        defaultValue: defaultTargetDir,
        placeholder: defaultTargetDir,
        validate: (value) => {
          return !value || formatTargetDir(value).length > 0
            ? undefined
            : 'Invalid project name'
        },
      })
      if (prompts.isCancel(projectName)) return cancel()
      targetDir = formatTargetDir(projectName)
    } else {
      targetDir = defaultTargetDir
    }
  }

  // 2. Handle directory if exist and not empty
  const argOverwrite = argv.overwrite
  if (fs.existsSync(targetDir) && !isEmptyDir(targetDir)) {
    let overwrite: 'yes' | 'no' | 'ignore' | undefined = argOverwrite
      ? 'yes'
      : undefined
    if (!overwrite) {
      if (interactive) {
        const res = await prompts.select({
          message:
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          options: [
            {
              label: 'Cancel operation',
              value: 'no',
            },
            {
              label: 'Remove existing files and continue',
              value: 'yes',
            },
            {
              label: 'Ignore files and continue',
              value: 'ignore',
            },
          ],
        })
        if (prompts.isCancel(res)) return cancel()
        overwrite = res
      } else {
        overwrite = 'no'
      }
    }

    switch (overwrite) {
      case 'yes':
        emptyDir(targetDir)
        break
      case 'no':
        cancel()
        return
    }
  }

  // 3. Get package name
  let packageName = path.basename(path.resolve(targetDir))
  if (!isValidPackageName(packageName)) {
    if (interactive) {
      const packageNameResult = await prompts.text({
        message: 'Package name:',
        defaultValue: toValidPackageName(packageName),
        placeholder: toValidPackageName(packageName),
        validate(dir) {
          if (dir && !isValidPackageName(dir)) {
            return 'Invalid package.json name'
          }
        },
      })
      if (prompts.isCancel(packageNameResult)) return cancel()
      packageName = packageNameResult
    } else {
      packageName = toValidPackageName(packageName)
    }
  }

  // 4. Choose a template and variant
  const argTemplate = argv.template
  let template = argTemplate
  let hasInvalidArgTemplate = false
  if (argTemplate && !TEMPLATES.includes(argTemplate as any)) {
    template = undefined
    hasInvalidArgTemplate = true
  }
  if (!template) {
    if (interactive) {
      const chosenTemplate = await prompts.select({
        message: hasInvalidArgTemplate
          ? `"${argTemplate}" isn't a valid template. Please choose from below: `
          : 'Select a template:',
        options: TEMPLATES.map((t) => {
          return {
            label: t.color(t.display || t.name),
            value: t,
          }
        }),
      })
      if (prompts.isCancel(chosenTemplate)) return cancel()

      const variant = await prompts.select({
        message: 'Select a variant:',
        options: chosenTemplate.variants.map((variant) => {
          return {
            label: variant.color(variant.display || variant.name),
            value: variant.name,
          }
        }),
      })
      if (prompts.isCancel(variant)) return cancel()

      template = variant
    } else {
      template = 'openapi'
    }
  }

  // 5.
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  // CREATE PROJECT WITH TEMPLATE
  const root = path.join(cwd, targetDir)
  fs.mkdirSync(root, { recursive: true })
  prompts.log.step(`Scaffolding project in ${root}...`)

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../..',
    `template-${template}`,
  )
  const renameFiles: Record<string, string | undefined> = {
    _gitignore: '.gitignore',
  }
  const files = fs.readdirSync(templateDir)
  const writeFile = write(root, templateDir, packageName, renameFiles)
  for (const file of files) writeFile(file)

  // DONE
  let doneMessage = ''
  const cdProjectName = path.relative(cwd, root)
  doneMessage += `Done. Now run:\n`
  if (root !== cwd) {
    doneMessage += `\n  cd ${
      cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
    }`
  }
  doneMessage += `\n  ${getInstallCommand(pkgManager).join(' ')}`
  doneMessage += `\n  ${getRunCommand(pkgManager, 'dev').join(' ')}`
  prompts.outro(doneMessage)
}

init().catch((e) => {
  console.error(e)
})

function getInstallCommand(agent: string) {
  if (agent === 'yarn') {
    return [agent]
  }
  return [agent, 'install']
}

function getRunCommand(agent: string, script: string) {
  switch (agent) {
    case 'yarn':
    case 'pnpm':
    case 'bun':
      return [agent, script]
    case 'deno':
      return [agent, 'task', script]
    default:
      return [agent, 'run', script]
  }
}
