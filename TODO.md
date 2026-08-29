# TODO

## Error Handling Enrichment | Add a specific error for insufficient XLM reserve
- [x] Step 1: Add `makeInsufficientXLMReserveError()` to `src/utils/errors.js`
- [x] Step 2: Update `src/middleware/errorHandler.js` to handle `isInsufficientXLMReserve`
- [x] Step 3: Add tests in `tests/errorHandler.test.js`
- [x] Step 4: Run tests to verify

## Response Normalisation | Normalise GET /account/:id/sequence response shape
- [ ] Analyse expected vs actual response shapes
- [ ] Implement normalization changes
- [ ] Run tests to verify

## Cache bypass documentation (?fresh=true)
- [ ] Confirm all endpoints that respect `?fresh=true` (likely `/network-status` and `/fee-estimate` and their subroutes).
- [ ] Update `README.md` with a "fresh cache bypass" section and request examples.

## Sanitize middleware: extend to req.body
- [ ] Update `src/middleware/sanitize.js` to sanitize `req.body` (strings, arrays, nested objects).
- [ ] Enforce the same max-length rule (500 chars) for body string values.
- [ ] Add/extend tests in `tests/sanitize.test.js` for body trimming, null-byte stripping, and 400 on >500 length.

## Standardize query parameter validation error messages (Option A)
- [ ] Update `src/utils/validators.js` error messages to use a single template (e.g., `Query parameter '<field>' ...`).
- [ ] Update inline query validation in `src/routes/account.js` for `GET /account/:id/volume` to throw `err.isValidation=true` with consistent message/field metadata.

## New endpoint: GET /account/:id/transaction-stats
- [ ] Implement the endpoint in `src/routes/account.js`.
- [ ] Add minimal query handling (if any).
- [ ] Add tests (or extend existing test coverage) to validate response shape and error handling.

## Issue #585: New Endpoint GET /account/:id/payment-summary
- [x] Add GET /:id/payment-summary route handler to `src/routes/account.js`
- [x] Add "payment-summary" to reserved words list to prevent routing conflicts
- [x] Returns { success: true, data: { totalSent, totalReceived, volumeSent, volumeReceived, topCounterparty, topAsset } }
- [x] All volume values are seven-decimal strings
- [x] Returns zeroed values for accounts with no payment history rather than a 404

## Issue #579: Add ?assets= filter to GET /account/:id/balances
- [x] Add optional ?assets= query param parsing to /balances route
- [x] "XLM" returns only native balance, "CODE:ISSUER" filters asset balances
- [x] Invalid identifiers are ignored
- [x] Returns empty array when no assets match

## Repo integrity
- [ ] Resolve merge conflict markers in `src/index.js` (currently present as `<<<<<<< HEAD` / `=======` / `>>>>>>>`).
- [ ] Ensure `npm test` passes.

## Issue #397: New Endpoint GET /transaction/:hash/effects
- [ ] Inspect existing transaction routes and response/normalization utilities
- [ ] Implement GET /transaction/:hash/effects route
  - [ ] Validate :hash is 64-char hex before Horizon call
  - [ ] Fetch all effects for transaction hash via Horizon
  - [ ] Normalize each effect with: effectId, type, account, createdAt, plus type-specific fields (best-effort)
  - [ ] Return { success: true, data: { effects: [...], total } }
  - [ ] Return 404 with clear message when transaction hash does not exist
- [x] Inspect existing transaction routes and response/normalization utilities
- [x] Implement GET /transaction/:hash/effects route
  - [x] Validate :hash is 64-char hex before Horizon call
  - [x] Fetch all effects for transaction hash via Horizon
  - [x] Normalize each effect with: effectId, type, account, createdAt, plus type-specific fields (best-effort)
  - [x] Return { success: true, data: { effects: [...], total } }
  - [x] Return 404 with clear message when transaction hash does not exist
- [x] Add/Update tests for the new endpoint (shape + validation + 404 behavior)
- [x] Ensure routing is registered in src/index.js (and docs list if applicable)
- [x] Run targeted unit tests for the endpoint only (no build)

TODO: Automated Scanner User-Agent Blocking Middleware

1. Project Discovery & Preparation

1. [ ] Inspect the project structure.
2. [ ] Identify the backend application entry point.
3. [ ] Identify the framework currently used by the API.
4. [ ] Locate existing middleware implementations.
5. [ ] Locate the existing route registration.
6. [ ] Locate the application's global error-handling mechanism.
7. [ ] Locate existing HTTP response helpers.
8. [ ] Locate existing authentication/authorization middleware.
9. [ ] Identify where global middleware is registered.
10. [ ] Identify the current test framework.
11. [ ] Locate existing middleware tests.
12. [ ] Review existing API response conventions.
13. [ ] Review existing 403/Forbidden responses.
14. [ ] Review existing environment-variable configuration.
15. [ ] Locate the ".env.example" file.
16. [ ] Confirm whether environment variables are loaded centrally.
17. [ ] Identify the preferred configuration module.
18. [ ] Review project coding conventions.
19. [ ] Review linting rules.
20. [ ] Review formatting rules.
21. [ ] Review TypeScript configuration if applicable.
22. [ ] Review package scripts.
23. [ ] Identify the command used to run unit tests.
24. [ ] Identify the command used to run integration tests.
25. [ ] Identify the command used to run linting.
26. [ ] Identify the command used to build the application.
27. [ ] Check whether middleware ordering is covered by tests.
28. [ ] Check whether requests pass through a common API layer.
29. [ ] Check whether health-check routes exist.
30. [ ] Determine whether scanner blocking should apply globally.
31. [ ] Confirm the requirement that blocking occurs before route handlers.
32. [ ] Confirm no route-specific implementation is needed.
33. [ ] Confirm no database changes are required.
34. [ ] Confirm no frontend changes are required.
35. [ ] Confirm the feature is server-side only.
36. [ ] Create or switch to the appropriate development branch.
37. [ ] Review the latest project state before modifying files.
38. [ ] Ensure the working tree is clean where appropriate.
39. [ ] Record the files expected to change.
40. [ ] Define the implementation scope.

2. Environment Configuration

41. [ ] Define the "BLOCKED_USER_AGENTS" environment variable.
42. [ ] Document that the variable accepts comma-separated patterns.
43. [ ] Add "BLOCKED_USER_AGENTS" to ".env.example".
44. [ ] Include representative scanner names in ".env.example".
45. [ ] Include "sqlmap" in the example blocklist.
46. [ ] Include "nikto" in the example blocklist.
47. [ ] Include "masscan" in the example blocklist.
48. [ ] Include "zgrab" in the example blocklist.
49. [ ] Keep the example configuration easy to understand.
50. [ ] Avoid hard-coding the blocklist inside middleware.
51. [ ] Ensure production configuration can override the example values.
52. [ ] Confirm missing "BLOCKED_USER_AGENTS" does not crash the application.
53. [ ] Treat an empty environment variable as an empty blocklist.
54. [ ] Handle surrounding whitespace in configured values.
55. [ ] Ignore empty entries caused by consecutive commas.
56. [ ] Normalize configuration values consistently.
57. [ ] Decide whether matching should be case-insensitive.
58. [ ] Implement case-insensitive matching for scanner names.
59. [ ] Document the matching behavior.
60. [ ] Avoid exposing environment configuration in API responses.
61. [ ] Ensure the blocklist is read from configuration.
62. [ ] Avoid requiring application code changes for new blocked agents.
63. [ ] Confirm environment loading occurs before middleware initialization.
64. [ ] Confirm test environments can provide custom blocklists.
65. [ ] Add configuration tests if the project structure supports them.
66. [ ] Verify ".env.example" syntax remains valid.
67. [ ] Verify no secrets are added to ".env.example".
68. [ ] Verify scanner names are examples rather than sensitive values.
69. [ ] Document how operators can extend the blocklist.
70. [ ] Keep configuration naming exactly as specified.

3. Middleware Design

71. [ ] Create a dedicated user-agent blocking middleware.
72. [ ] Give the middleware a descriptive name.
73. [ ] Keep the middleware focused on user-agent filtering.
74. [ ] Avoid mixing authentication logic into this middleware.
75. [ ] Avoid mixing rate limiting into this middleware.
76. [ ] Avoid modifying unrelated request behavior.
77. [ ] Read the incoming "User-Agent" header.
78. [ ] Handle the absence of the "User-Agent" header.
79. [ ] Allow requests without a user agent.
80. [ ] Do not treat missing user agent as suspicious by itself.
81. [ ] Read the configured "BLOCKED_USER_AGENTS" values.
82. [ ] Parse the environment variable as comma-separated values.
83. [ ] Trim whitespace from each configured pattern.
84. [ ] Remove empty patterns.
85. [ ] Normalize values for case-insensitive matching.
86. [ ] Normalize the incoming user agent for comparison.
87. [ ] Compare the request user agent against configured patterns.
88. [ ] Support recognisable scanner identifiers such as "sqlmap".
89. [ ] Support recognisable scanner identifiers such as "nikto".
90. [ ] Support recognisable scanner identifiers such as "masscan".
91. [ ] Support recognisable scanner identifiers such as "zgrab".
92. [ ] Ensure scanner names embedded in a longer User-Agent are detected.
93. [ ] Avoid requiring an exact full-string User-Agent match.
94. [ ] Use substring/pattern matching appropriate to the requirement.
95. [ ] Consider safely supporting regular-expression patterns only if project requirements call for them.
96. [ ] Avoid unsafe dynamic regular-expression behavior if simple substring matching is sufficient.
97. [ ] Prevent malformed configuration from crashing requests.
98. [ ] Ensure matching is deterministic.
99. [ ] Ensure the middleware has minimal processing overhead.
100. [ ] Return immediately when a blocked match is found.
101. [ ] Do not call the next middleware after a blocked match.
102. [ ] Do not call the route handler after a blocked match.
103. [ ] Do not perform unnecessary database queries.
104. [ ] Do not perform authentication work before blocking if ordering permits.
105. [ ] Do not expose the matched scanner name.
106. [ ] Do not expose the configured blocklist.
107. [ ] Do not reveal internal implementation details.
108. [ ] Keep the middleware reusable.
109. [ ] Keep the implementation easy to unit test.
110. [ ] Add comments only where they clarify non-obvious behavior.

4. Middleware Registration

111. [ ] Locate the global middleware registration point.
112. [ ] Register the scanner-blocking middleware globally.
113. [ ] Place it before route handlers.
114. [ ] Ensure it executes before protected routes.
115. [ ] Ensure it executes before public API routes.
116. [ ] Ensure it executes before expensive route processing.
117. [ ] Ensure it executes before database-heavy handlers.
118. [ ] Ensure it executes before controller execution.
119. [ ] Verify middleware ordering explicitly.
120. [ ] Ensure the middleware does not bypass normal requests.
121. [ ] Ensure "next()" is called for allowed requests.
122. [ ] Ensure "next()" is not called for blocked requests.
123. [ ] Ensure registration does not duplicate the middleware.
124. [ ] Ensure middleware registration does not affect static assets unexpectedly unless intended.
125. [ ] Confirm the intended application-wide scope.
126. [ ] Verify the middleware is active in development.
127. [ ] Verify the middleware is active in tests.
128. [ ] Verify the middleware is active in production builds.
129. [ ] Verify configuration is available when middleware starts.
130. [ ] Confirm startup does not fail when the blocklist is empty.

5. Forbidden Response

131. [ ] Implement a 403 response for blocked requests.
132. [ ] Set the HTTP status code to "403".
133. [ ] Return the required JSON response structure.
134. [ ] Set "success" to "false".
135. [ ] Set "error.type" to "Forbidden".
136. [ ] Set "error.message" to "Access denied.".
137. [ ] Match the required capitalization exactly.
138. [ ] Match the required punctuation exactly.
139. [ ] Avoid returning the scanner User-Agent in the response.
140. [ ] Avoid returning additional diagnostic information.
141. [ ] Ensure the response is valid JSON.
142. [ ] Ensure the response uses the application's normal JSON response mechanism where appropriate.
143. [ ] Ensure response headers are appropriate.
144. [ ] Ensure blocked requests cannot reach route handlers.
145. [ ] Verify the response body against the acceptance criteria.
146. [ ] Verify the status code independently from the response body.
147. [ ] Verify content type where applicable.
148. [ ] Verify the error response is consistent across affected routes.
149. [ ] Verify no stack trace is returned.
150. [ ] Verify no internal configuration is returned.

6. Matching Behavior

151. [ ] Test exact scanner User-Agent values.
152. [ ] Test scanner names embedded in User-Agent strings.
153. [ ] Test uppercase scanner names.
154. [ ] Test lowercase scanner names.
155. [ ] Test mixed-case scanner names.
156. [ ] Test leading/trailing whitespace in configuration.
157. [ ] Test multiple configured scanner patterns.
158. [ ] Test one blocked pattern among several allowed patterns.
159. [ ] Test an empty blocklist.
160. [ ] Test a missing "BLOCKED_USER_AGENTS" variable.
161. [ ] Test an empty "User-Agent".
162. [ ] Test a missing "User-Agent".
163. [ ] Ensure missing "User-Agent" requests are allowed.
164. [ ] Test a normal browser User-Agent.
165. [ ] Test a mobile browser User-Agent.
166. [ ] Test an API client User-Agent.
167. [ ] Test a custom application User-Agent.
168. [ ] Confirm normal clients are not accidentally blocked.
169. [ ] Confirm only configured patterns trigger blocking.
170. [ ] Confirm partial matching behaves as intended.
171. [ ] Confirm matching is case-insensitive.
172. [ ] Confirm whitespace normalization works.
173. [ ] Confirm empty configuration entries are ignored.
174. [ ] Confirm adding a new pattern requires no code change.
175. [ ] Confirm removing a pattern allows matching requests again.
176. [ ] Confirm configuration changes take effect according to application configuration lifecycle.
177. [ ] Confirm no false positive is introduced by unrelated User-Agent text.
178. [ ] Document any deliberate matching limitations.
179. [ ] Keep matching behavior predictable.
180. [ ] Keep matching logic covered by tests.

7. Unit Tests

181. [ ] Create or update middleware unit tests.
182. [ ] Add a test for a blocked "sqlmap" User-Agent.
183. [ ] Assert the blocked request receives status "403".
184. [ ] Assert "success" is "false".
185. [ ] Assert "error.type" equals "Forbidden".
186. [ ] Assert "error.message" equals "Access denied.".
187. [ ] Assert the next handler is not called.
188. [ ] Add a test for a blocked "nikto" User-Agent.
189. [ ] Add a test for a blocked "masscan" User-Agent.
190. [ ] Add a test for a blocked "zgrab" User-Agent.
191. [ ] Add a test for a normal allowed User-Agent.
192. [ ] Assert allowed requests continue.
193. [ ] Assert the next handler is called for allowed requests.
194. [ ] Add a test for a missing User-Agent.
195. [ ] Assert missing User-Agent requests are allowed.
196. [ ] Assert the next handler is called for missing User-Agent requests.
197. [ ] Add a test for case-insensitive matching.
198. [ ] Add a test for multiple configured patterns.
199. [ ] Add a test for whitespace around patterns.
200. [ ] Add a test for an empty blocklist.
201. [ ] Add a test for an unset blocklist.
202. [ ] Add a test for an unrelated scanner-like string if needed.
203. [ ] Confirm tests isolate environment configuration.
204. [ ] Restore environment variables after each test.
205. [ ] Prevent test configuration leaking between cases.
206. [ ] Avoid depending on developer-local ".env" values.
207. [ ] Use deterministic test configuration.
208. [ ] Keep tests readable.
209. [ ] Give tests descriptive names.
210. [ ] Ensure assertions cover both status and body.

8. Integration Tests

211. [ ] Identify an API endpoint suitable for middleware testing.
212. [ ] Add an integration test for a blocked request.
213. [ ] Send a blocked scanner User-Agent.
214. [ ] Verify the request receives HTTP 403.
215. [ ] Verify the response JSON structure.
216. [ ] Verify the route handler is not executed.
217. [ ] Add an integration test for an allowed User-Agent.
218. [ ] Verify the request reaches the route handler.
219. [ ] Verify the normal endpoint response remains unchanged.
220. [ ] Add an integration test without a User-Agent.
221. [ ] Verify the request remains allowed.
222. [ ] Verify existing authentication behavior is not unintentionally changed.
223. [ ] Verify existing API error handling remains functional.
224. [ ] Verify middleware ordering through observable behavior.
225. [ ] Ensure the tests exercise the actual application middleware stack.
226. [ ] Avoid testing only the middleware function where ordering matters.
227. [ ] Confirm blocked requests are stopped before route execution.
228. [ ] Confirm no side effects occur from blocked requests.
229. [ ] Confirm normal requests remain unaffected.
230. [ ] Keep integration tests deterministic.

9. Security & Reliability Review

231. [ ] Review middleware for bypasses caused by casing.
232. [ ] Review middleware for bypasses caused by surrounding whitespace.
233. [ ] Review middleware for missing headers.
234. [ ] Review middleware for unusually long User-Agent values.
235. [ ] Review middleware for malformed environment configuration.
236. [ ] Ensure matching does not throw on unexpected input.
237. [ ] Ensure matching does not expose internal errors.
238. [ ] Ensure blocked requests are rejected early.
239. [ ] Ensure route handlers cannot override the 403 decision.
240. [ ] Ensure the middleware cannot accidentally allow blocked requests.
241. [ ] Ensure normal clients are not broadly blocked.
242. [ ] Review the chosen matching strategy for false positives.
243. [ ] Review whether patterns should be treated as literal strings.
244. [ ] Avoid introducing unnecessary regex complexity.
245. [ ] Avoid evaluating untrusted configuration as executable code.
246. [ ] Avoid logging full malicious User-Agent strings unless logging policy permits it.
247. [ ] Avoid logging sensitive request information.
248. [ ] Consider whether blocked requests should be logged.
249. [ ] If logging is implemented, keep it structured and minimal.
250. [ ] Ensure logging cannot create excessive log volume.

10. Documentation

251. [ ] Update ".env.example".
252. [ ] Document the purpose of "BLOCKED_USER_AGENTS".
253. [ ] Document comma-separated configuration.
254. [ ] Document that matching is case-insensitive.
255. [ ] Document that configured patterns are matched against the User-Agent.
256. [ ] Document that requests without a User-Agent are allowed.
257. [ ] Document the 403 response behavior.
258. [ ] Document how to add another scanner identifier.
259. [ ] Ensure documentation does not imply this is a complete security solution.
260. [ ] Clarify that User-Agent blocking is one layer of defense.
261. [ ] Avoid documenting sensitive deployment configuration.
262. [ ] Keep documentation consistent with actual implementation.
263. [ ] Update relevant architecture documentation if required.
264. [ ] Update API/security documentation if present.
265. [ ] Add a short implementation note if the project maintains changelogs.
266. [ ] Confirm ".env.example" remains synchronized with configuration names.
267. [ ] Remove obsolete configuration references if discovered.
268. [ ] Check documentation for incorrect variable names.
269. [ ] Check documentation for incorrect response examples.
270. [ ] Keep the final documentation concise.

11. Validation

271. [ ] Run unit tests.
272. [ ] Run middleware-specific tests.
273. [ ] Run integration tests.
274. [ ] Run the complete test suite.
275. [ ] Run linting.
276. [ ] Run formatting checks.
277. [ ] Run the production build.
278. [ ] Verify no TypeScript errors occur if applicable.
279. [ ] Verify no unused imports are introduced.
280. [ ] Verify no environment-variable validation errors occur.
281. [ ] Manually start the application with scanner blocklist configuration.
282. [ ] Send a request using a blocked User-Agent.
283. [ ] Confirm HTTP 403.
284. [ ] Confirm the exact JSON error body.
285. [ ] Send a request using a normal browser User-Agent.
286. [ ] Confirm the request succeeds normally.
287. [ ] Send a request without a User-Agent.
288. [ ] Confirm the request succeeds normally.
289. [ ] Test changing the blocklist configuration.
290. [ ] Confirm newly configured patterns are blocked after configuration reload/restart as applicable.
291. [ ] Confirm removed patterns are no longer blocked after configuration reload/restart as applicable.
292. [ ] Verify middleware runs before route handlers.
293. [ ] Verify no unrelated endpoints regress.
294. [ ] Review the final diff.
295. [ ] Remove unnecessary changes.
296. [ ] Confirm all acceptance criteria are explicitly covered by tests.
297. [ ] Confirm ".env.example" is updated.
298. [ ] Confirm blocked requests return the exact required 403 response.
299. [ ] Confirm allowed and missing User-Agent cases pass.
300. [ ] Mark the task complete and prepare the implementation for review.
