# Automated Tests

This project uses **Vitest** and **React Testing Library** for automated testing.

## 🚀 Quick Start

### Run all tests:
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes):
```bash
npm test
# Press 'a' to run all tests
# Press 'q' to quit
```

### Run tests once (CI mode):
```bash
npm run test:run
```

### Run tests with UI (interactive):
```bash
npm run test:ui
```

### Run tests with coverage:
```bash
npm run test:coverage
```

## 📁 Test Structure

```
tests/
├── setup.js              # Test configuration and mocks
├── Auth.test.js          # Authentication component tests
├── RequestForm.test.js   # Request form validation tests
└── utils.test.js         # Utility function tests
```

## ✅ What's Tested

### Auth Component (`Auth.test.js`)
- ✅ Renders login form by default
- ✅ Switches between login and signup
- ✅ Validates email format
- ✅ Validates password length

### Request Form (`RequestForm.test.js`)
- ✅ Renders all form fields
- ✅ Validates required fields
- ✅ Validates email/phone format
- ✅ Validates description length
- ✅ Submits form with valid data

### Utility Functions (`utils.test.js`)
- ✅ Triage score calculation
- ✅ Triage category assignment
- ✅ Triage color mapping

## 🧪 Writing New Tests

### Example Test:
```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '../src/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## 🔧 Test Configuration

- **Framework:** Vitest
- **Testing Library:** React Testing Library
- **Environment:** jsdom (browser-like environment)
- **Setup:** `tests/setup.js`

## 📝 Notes

- Tests are located in the `tests/` directory
- Mock Supabase client is configured in `setup.js`
- Environment variables are mocked for testing
- All tests run in isolation

## 🐛 Troubleshooting

### Tests fail with "Cannot find module"
- Make sure all dependencies are installed: `npm install`

### Tests fail with Supabase errors
- Supabase is mocked in tests - no real connection needed
- Check `tests/setup.js` for mock configuration

### Tests are slow
- Use `npm run test:run` for faster single-run execution
- Consider using `vi.mock()` for heavy dependencies


