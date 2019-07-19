import meow from 'meow'
import cli from './cli'

const args = meow(
  `
	Usage
	  $ create-raspbian-image
`,
  {
    flags: {
      rainbow: {
        type: 'boolean',
        alias: 'r',
      },
    },
  }
)

cli(args)
