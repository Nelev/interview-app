JUDGE_PROMPT = """You are an expert evaluator assessing the quality of a set of interview questions for a specific role
or job description given as input from a chatbot response.

## Task
Evaluate the following response on four dimensions, each scored 1-5.

##
{job}

## Reference: Key Aspects a Good Set of Questions Should Cover
{key_aspects}

## Response to Evaluate
{response}

## Scoring Rubric

### Coherence (logical structure and organization)
1 - No structure, random thoughts jumbled together
2 - Weak structure, some ideas connected but mostly disorganized
3 - Adequate structure, main points identifiable but flow could be improved
4 - Well-structured, logical progression with clear sections
5 - Excellent structure, perfectly organized with smooth transitions between ideas

### Relevance (addresses the questions and covers key aspects)
1 - Completely off-topic or generic advice unrelated to the question
2 - Partially relevant but misses the main concern; covers few key aspects
3 - Addresses the question but misses several important key aspects
4 - Directly addresses the questions and covers most key aspects
5 - Thoroughly addresses the question, covers all key aspects with specific details

### Fluency (natural, professional, clear language)
1 - Difficult to read, major grammar/clarity issues
2 - Understandable but awkward phrasing or unclear passages
3 - Clear and readable but somewhat generic or flat in tone
4 - Professional and engaging, clear language throughout
5 - Exceptionally well-written, natural conversational tone, engaging and professional

### Consistency (no contradictions, internally aligned advice)
1 - Major contradictions, advice conflicts with itself
2 - Some inconsistencies that could confuse the reader
3 - Mostly consistent with minor tensions between points
4 - Consistent throughout, advice aligns well
5 - Perfectly consistent, all points reinforce each other

## Output Format
First provide your reasoning, then score each dimension.
Use EXACTLY this format:

REASONING: <your overall assessment>
Coherence: <score> | <one-sentence justification>
Relevance: <score> | <one-sentence justification>
Fluency: <score> | <one-sentence justification>
Consistency: <score> | <one-sentence justification>"""
