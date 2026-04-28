import { createColors, type ColorFunc } from './_create-color.ts'

const { green } = createColors()

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

export const TEMPLATES: Template[] = [
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
