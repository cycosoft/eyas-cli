# Pre-Deployment Tests

- Use `npm run dev` to run CLI

# Deployment Process

- Tag the commit with the new version -> `git tag -a v4.0.0 -m "v4.0.0"`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/eyas-cli/releases )
- Final Test - Module in another project -> `npm pack`
- Deploy to NPM -> `npm publish`
- Publish GitHub release
