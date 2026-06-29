# Source: COCA 5000 Word Frequency List

## Origin
Based on the Corpus of Contemporary American English (COCA) 1 billion word corpus from Mark Davies (www.wordfrequency.info). The word list reflects high-frequency usage in American English from 2020-2024, balancing blogs, academic articles, magazines, movies/TV subtitles, spoken transcripts, and web pages.

## License
Data is available under a custom license for academic research. For production use, consider purchasing extended data access from wordfrequency.info.

## Extraction Method
1. Downloaded the COCA frequency API data via the wordfrequency.info web interface
2. Extracted the top 5000 words ranked by frequency
3. Converted to CSV format, then to TXT (one word per line, rank not included)
4. De-duplicated lemma forms and cleaned non-alphabetic characters
5. Sample validation: "the, be, and, of, to" match expected top 5

## Known Issues
- Some proper nouns and archaic forms included (sports terms, historical figures)
- No part-of-speech tagging included
- Manual review recommended for educational contexts

## Usage Notes
- Words are lemmatized (inflections merged) but not POS-classified
- For words with AI gaps, supplement with manually researched definitions
- Consider adding your own examples after importing
- Intended for personal vocabulary mastery, not content generation

## Extraction Date
2025-06-25 (extracted via web scrape)

## Alternate Sources for Future Scaling
- Wikipedia dump for definitions/example sentences
- OpenAI dataset with ratings (requires manual review)
- Custom user-curated lists for domain specialization