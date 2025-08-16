# AI SDK by Vercel Expert Research Report

## 1. Scope and Boundaries
- **One-sentence scope**: "Vercel AI SDK streaming, model integration, tool calling, React hooks, edge runtime optimization, and production patterns"
- **15 Recurring Problems** (with frequency × complexity ratings)
- **Sub-domain mapping**: Delegate to nextjs-expert for routing, react-performance-expert for React optimization, typescript-type-expert for type issues

## 2. Topic Map (6 Categories)

### Category 1: Streaming & Real-time Responses
**Common Errors:**
- "Failed to parse stream"
- "Response not streaming"
- "Unexpected end of JSON input"

**Frequency × Complexity**: HIGH × MEDIUM = High Priority

**Root Causes:**
- Missing `Content-Type: text/event-stream` header
- Incorrect StreamingTextResponse usage
- Client-side parsing errors

**Fix Strategies:**
1. **Fix 1 (Quick)**: Add proper headers
2. **Fix 2 (Better)**: Use StreamingTextResponse helper
3. **Fix 3 (Best)**: Implement custom stream handler with error recovery

**Diagnostics:**
```bash
curl -N -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}' \
  http://localhost:3000/api/chat
```

**Validation:**
- Stream chunks arrive progressively
- No parsing errors in console
- UI updates in real-time

**Resources:**
- [Streaming Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/streaming)
- [StreamingTextResponse API](https://sdk.vercel.ai/docs/reference/ai-sdk-core/streaming-text-response)

### Category 2: Model Provider Integration
**Common Errors:**
- "Invalid API key"
- "Model not found"
- "Provider not configured"

**Frequency × Complexity**: HIGH × LOW = Medium Priority

**Root Causes:**
- Missing environment variables
- Incorrect provider import
- Wrong model identifier

**Fix Strategies:**
1. **Fix 1 (Quick)**: Set environment variables
2. **Fix 2 (Better)**: Use provider factory pattern
3. **Fix 3 (Best)**: Implement provider abstraction with fallbacks

**Diagnostics:**
```bash
# Check environment variables
env | grep -E "OPENAI_API_KEY|ANTHROPIC_API_KEY"
# Verify provider imports
grep -r "@ai-sdk" package.json
```

**Validation:**
- Providers initialize without errors
- API calls succeed
- Correct model responses

**Resources:**
- [Provider Overview](https://sdk.vercel.ai/docs/ai-sdk-providers/overview)
- [Provider Configuration](https://sdk.vercel.ai/docs/ai-sdk-providers/openai)

### Category 3: Tool Calling & Structured Outputs
**Common Errors:**
- "Tool not found"
- "Invalid schema"
- "Type mismatch in tool response"

**Frequency × Complexity**: MEDIUM × HIGH = High Priority

**Root Causes:**
- Zod schema doesn't match tool interface
- Tool not registered correctly
- Missing type definitions

**Fix Strategies:**
1. **Fix 1 (Quick)**: Fix schema types
2. **Fix 2 (Better)**: Use generateObject for structured data
3. **Fix 3 (Best)**: Implement type-safe tool registry

**Diagnostics:**
```bash
# Check tool definitions
grep -r "tools:" --include="*.ts" --include="*.tsx"
# Verify Zod schemas
grep -r "z.object" --include="*.ts"
```

**Validation:**
- Tools execute when called
- Responses match schema
- TypeScript compilation succeeds

**Resources:**
- [Tool Calling Guide](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- [Structured Generation](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)

### Category 4: React Hooks & State Management
**Common Errors:**
- "Too many re-renders"
- "Hook called conditionally"
- "Stale closure in useEffect"

**Frequency × Complexity**: HIGH × MEDIUM = High Priority

**Root Causes:**
- Missing dependencies in useEffect
- State updates in render
- Incorrect hook usage

**Fix Strategies:**
1. **Fix 1 (Quick)**: Add missing dependencies
2. **Fix 2 (Better)**: Use useMemo/useCallback
3. **Fix 3 (Best)**: Extract custom hooks with proper abstraction

**Diagnostics:**
```bash
# Check hook usage
grep -r "useChat\|useCompletion" --include="*.tsx"
# Find potential issues
npx eslint . --rule react-hooks/exhaustive-deps
```

**Validation:**
- No re-render loops
- Hooks follow rules
- State updates correctly

**Resources:**
- [useChat Hook](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [React Integration](https://sdk.vercel.ai/docs/ai-sdk-ui/overview)

### Category 5: Edge Runtime Optimization
**Common Errors:**
- "Module not found in edge runtime"
- "Memory limit exceeded"
- "Cold start timeout"

**Frequency × Complexity**: MEDIUM × HIGH = High Priority

**Root Causes:**
- Using Node.js-only modules
- Large bundle size
- Inefficient initialization

**Fix Strategies:**
1. **Fix 1 (Quick)**: Remove Node.js dependencies
2. **Fix 2 (Better)**: Optimize bundle with dynamic imports
3. **Fix 3 (Best)**: Implement edge-first architecture

**Diagnostics:**
```bash
# Analyze bundle size
next build --analyze
# Check for Node.js APIs
grep -r "fs\|path\|crypto" --include="*.ts"
```

**Validation:**
- Deploys to edge successfully
- Fast cold starts (<100ms)
- Memory usage under limits

**Resources:**
- [Edge Runtime](https://sdk.vercel.ai/docs/troubleshooting/edge-runtime)
- [Performance Guide](https://sdk.vercel.ai/docs/ai-sdk-core/settings)

### Category 6: Production Patterns
**Common Errors:**
- "Rate limit exceeded"
- "Timeout after 30 seconds"
- "Token limit reached"

**Frequency × Complexity**: MEDIUM × MEDIUM = Medium Priority

**Root Causes:**
- No retry logic
- Missing rate limiting
- Poor error handling

**Fix Strategies:**
1. **Fix 1 (Quick)**: Add basic retry
2. **Fix 2 (Better)**: Implement exponential backoff
3. **Fix 3 (Best)**: Queue system with rate limiting

**Diagnostics:**
```bash
# Check error handling
grep -r "try.*catch" --include="*.ts"
# Find retry logic
grep -r "retry\|backoff" --include="*.ts"
```

**Validation:**
- Handles errors gracefully
- Retries succeed
- No data loss

**Resources:**
- [Error Handling](https://sdk.vercel.ai/docs/troubleshooting/common-issues)
- [Production Best Practices](https://sdk.vercel.ai/docs/guides/production)

## 3. Decision Trees

### Choosing Streaming Method
```
Need real-time updates?
├─ Yes → Use streaming
│   ├─ Simple text → StreamingTextResponse
│   ├─ Structured data → Stream with JSON chunks
│   └─ UI components → RSC streaming
└─ No → Use generateText
```

### Provider Selection
```
Which model to use?
├─ Fast + cheap → gpt-5-mini
├─ Quality → gpt-5
├─ Long context → gemini-2.5-pro or gemini-2.5-flash (1M tokens)
└─ Open source → llama-4
└─ Edge compatible → Use edge-optimized models
```

### Error Handling Strategy
```
Error type?
├─ Rate limit → Exponential backoff
├─ Token limit → Truncate/summarize
├─ Network → Retry with timeout
├─ Invalid input → Validate and sanitize
└─ API error → Fallback provider
```

## 4. Performance Benchmarks

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Stream first byte | <500ms | <1s | >2s |
| Complete response | <5s | <10s | >15s |
| Hook re-render | 0 unnecessary | <3 | >5 |
| Bundle size | <50KB | <100KB | >200KB |
| Memory usage | <128MB | <256MB | >512MB |

## 5. Common Patterns

### Pattern: Provider Abstraction
```typescript
// Unified interface for all providers
interface AIProvider {
  generateText(prompt: string): Promise<string>
  stream(prompt: string): AsyncIterable<string>
}
```

### Pattern: Error Recovery
```typescript
// Automatic retry with fallback
async function resilientGenerate(prompt: string) {
  try {
    return await primary.generate(prompt)
  } catch (error) {
    if (isRateLimit(error)) {
      await sleep(backoffTime)
      return fallback.generate(prompt)
    }
    throw error
  }
}
```

### Pattern: Stream Buffering
```typescript
// Buffer chunks for better UX
const buffer = new StreamBuffer()
for await (const chunk of stream) {
  buffer.add(chunk)
  if (buffer.shouldFlush()) {
    yield buffer.flush()
  }
}
```

## 6. Testing Strategies

- **Unit tests**: Mock providers and streams
- **Integration tests**: Test actual API calls with test keys
- **E2E tests**: Full user flow with Playwright
- **Load tests**: Concurrent requests and rate limits
- **Edge tests**: Deploy to edge and verify functionality