// promptEvolveExamples.js

const examples = [
  {
    id: "youtube_title",
    description:
      "Generate a click-worthy, under-60-character YouTube video title from a transcript",
    params: {
      initialPromptTemplate: `
  Please generate a short, actionable title for this YouTube video transcript:
  \${transcript}
  `.trim(),
      variables: [
        {
          name: "transcript",
          description:
            "The full transcript of a YouTube video about productivity hacks",
          example: `
  So in today's video, I want to talk about how waking up earlier helped me reclaim my time.
  At first, it was tough. I’d hit snooze and feel exhausted.
  But then I started using a consistent bedtime and a light alarm clock.
  Within a week, I was waking up at 6AM, and I had a whole extra hour to journal, exercise, and plan my day.
  That single change—getting up before the world does—transformed how I show up in my job and my life.
            `.trim(),
        },
      ],
      idealOutput: "Waking Up at 6AM Changed My Life",
      model: "gpt-4o-mini",
      maxIterations: 5,
      telemetry: {
        filePath: "telemetry.json",
        reporterType: "json",
      },
    },
  },
  {
    id: "markdown_faq",
    description:
      "Generate a Markdown-formatted FAQ entry with question, answer, key points, Do’s, and Don’ts",
    params: {
      initialPromptTemplate: `
  Please generate a Markdown FAQ entry for the feature:
  \${featureName}
  
  Topic: \${topic}
  
  Audience: \${audience}
  
  Make it an FAQ with:
  - A level-2 heading for the question
  - A level-3 “Answer” heading and paragraph
  - A bullet list of key points
  - A bold “Do’s:” heading + bullets
  - A bold “Don’ts:” heading + bullets
        `.trim(),
      variables: [
        {
          name: "featureName",
          description: "The name of the product feature to explain",
          example: "FeatureX",
        },
        {
          name: "topic",
          description: "What the feature is used for or its domain",
          example: "peer-to-peer file sharing",
        },
        {
          name: "audience",
          description: "Who will read this FAQ (tone and complexity)",
          example: "technical end users",
        },
      ],
      idealOutput: `
  ## What is FeatureX?
  
  ### Answer
  FeatureX lets you securely share large files over peer-to-peer connections without needing a central server.
  
  - **Encrypted** end-to-end
  - Supports files up to **5 GB**
  - Auto-retries on network failure
  
  **Do’s:**
  - Use FeatureX for confidential document exchange.
  - Verify fingerprints before sharing.
  - Enable auto-delete after 24 hours.
  
  **Don’ts:**
  - Don’t share sensitive data over public Wi-Fi without a VPN.
  - Don’t bypass confirmation prompts.
  - Don’t exceed recommended file size.
        `.trim(),
      model: "gpt-4o-mini",
      maxIterations: 5,
      telemetry: {
        filePath: "telemetry_markdown_faq.json",
        reporterType: "json",
      },
    },
  },
];

export const findExample = (id: string) =>
  examples.find((example) => example.id === id);

export default examples;
