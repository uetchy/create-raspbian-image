import meow from 'meow'
import cli from './cli'

const args = meow(
  `
	Usage
	  $ raspbian-wizard [option]

	Examples
	  $ raspbian-wizard
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
