# Public API Key Reference Sheet

Checked date: 2026-04-30  
Source list: pasted `public-apis-directory.html` data in this chat, plus a separate 2026 AI/LLM addendum.  
Key rule: private API keys are not included. Only official public demo/test keys are shown when a provider documents one.

No local `.env` files were found in `/Users/justice/Documents/New project`, so nothing here is classified as "Use existing env var" yet.

## 1. No setup / no auth APIs

These go first because they are the easiest to use. Some still require fair-use behavior, a User-Agent, attribution, or non-commercial use.

| Service | Category | What it does | API/key link | Free tier details | Credit card required | Key status | Suggested env var | Setup notes |
|---|---|---|---|---|---|---|---|---|
| Open-Meteo | Weather, data | Forecast, historical weather, geocoding, air quality, marine, elevation, and climate APIs. | [Docs/pricing](https://open-meteo.com/en/pricing) | No key for free/open-access non-commercial use; official limits: 10,000 calls/day, 5,000/hour, 600/min. | No | No auth | None | Use directly for personal/student weather apps; use paid key for production/commercial. |
| US National Weather Service | Weather, alerts | US forecasts, alerts, observations, zones, and gridpoint data. | [Docs](https://www.weather.gov/documentation/services-web-api) | Free public US government API; rate limit is not public but described as generous for typical use. | No | No auth | None | Send a descriptive User-Agent/contact; US-only. |
| AviationWeather | Weather, aviation | NOAA aviation weather observations and forecasts. | [Docs](https://www.aviationweather.gov/dataserver) | Free NOAA aviation data, no key listed in source directory. | No | No auth | None | Good for METAR/TAF aviation projects. |
| Meteorologisk Institutt | Weather | Norwegian Meteorological Institute weather and climate APIs. | [Docs](https://api.met.no/weatherapi/documentation) | Free, no API key; requires identifying User-Agent. | No | No auth | None | Add app/contact in User-Agent. |
| RainViewer | Weather, maps | Global weather radar map tiles and metadata. | [Docs](https://www.rainviewer.com/api.html) | Free public radar API; no auth in source directory. | No | No auth | None | Useful for weather-map overlays. |
| openSenseMap | Weather, IoT data | Environmental sensor data from senseBox stations. | [API](https://api.opensensemap.org/) | Free public API, no key in source directory. | No | No auth | None | Good for air/weather sensor dashboards. |
| Hong Kong Observatory | Weather, climate | Weather, earthquake, and climate open data for Hong Kong. | [Open data](https://www.hko.gov.hk/en/abouthko/opendata_intro.htm) | Free public open data. | No | No auth | None | Regional but reliable. |
| UK Carbon Intensity | Environment, energy | Great Britain electricity carbon intensity data. | [Docs](https://carbon-intensity.github.io/api-definitions/) | Free official API, no key in source directory. | No | No auth | None | Good for automation that schedules work when power is cleaner. |
| Website Carbon | Environment, developer tools | Estimates web-page carbon impact. | [API](https://api.websitecarbon.com/) | Free public API, no key in source directory. | No | No auth | None | Useful for site audits. |
| GeoJS | Maps, geolocation | IP geolocation in JSON/JSONP. | [Docs](https://www.geojs.io/) | Free public API, no key in source directory. | No | No auth | None | Good for lightweight IP country/city lookup. |
| ipapi.co | Maps, geolocation | IP geolocation and network metadata. | [Docs](https://ipapi.co/api/) | Free unauthenticated usage exists with lower limits; paid keys increase capacity. | No | No auth | None | Use lightly; add paid token if you need reliability. |
| Nominatim | Maps, geocoding | OpenStreetMap forward and reverse geocoding. | [Docs](https://nominatim.org/release-docs/latest/api/Overview/) | Free public service with strict usage policy, commonly 1 request/sec and valid User-Agent. | No | No auth | None | Do not bulk geocode on the public endpoint; self-host for heavy use. |
| Postcodes.io | Maps, UK data | UK postcode lookup and geolocation. | [Docs](https://postcodes.io) | Free public API, no key in source directory. | No | No auth | None | UK-only. |
| adresse.data.gouv.fr | Maps, geocoding | French government address search/geocoding. | [Docs](https://adresse.data.gouv.fr) | Free public API, no key in source directory. | No | No auth | None | France-focused. |
| GeoAPI / api.gouv.fr | Maps, open data | French geographical data APIs. | [API page](https://api.gouv.fr/api/geoapi.html) | Free public API, no key in source directory. | No | No auth | None | France-focused. |
| Geocode.xyz | Maps, geocoding | Forward/reverse geocoding and geoparsing. | [Docs](https://geocode.xyz/api) | Free no-key use with strict throttling; paid key for higher limits. | No | No auth | None | Use only for small tests unless upgraded. |
| Open Topo Data | Maps, elevation | Elevation and ocean depth by latitude/longitude. | [Docs](https://www.opentopodata.org) | Free public API, no key in source directory. | No | No auth | None | Respect service limits; self-host possible. |
| REST Countries | Maps, data | Country metadata, currencies, languages, flags, and borders. | [Docs](https://restcountries.com) | Free public API, no key in source directory. | No | No auth | None | Great static reference API. |
| Zippopotam.us | Maps, postal data | Postal code to place/country/state data. | [API](http://www.zippopotam.us) | Free public API, no key in source directory. | No | No auth | None | HTTP in source; verify HTTPS behavior before production. |
| ViaCep | Maps, postal data | Brazilian ZIP/postal address lookup. | [API](https://viacep.com.br) | Free public API, no key in source directory. | No | No auth | None | Brazil-focused. |
| bng2latlong | Maps, geospatial | Converts British National Grid coordinates to WGS84 lat/lon. | [API](https://www.getthedata.com/bng2latlong) | Free public API, no key in source directory. | No | No auth | None | UK geospatial utility. |
| Country.is | Maps, geolocation | Gets visitor country from IP. | [API](http://country.is/) | Free public API, no key in source directory. | No | No auth | None | Simple IP country lookup. |
| Data USA | Open data | US public statistics API. | [Docs](https://datausa.io/about/api/) | Free public API, no key in source directory. | No | No auth | None | Useful for demographic/economic data. |
| USAspending.gov | Government, finance | US federal spending data. | [Docs](https://api.usaspending.gov/) | Free public API, no key in source directory. | No | No auth | None | Good for procurement/spending analysis. |
| Federal Register | Government, legal data | US federal rulemaking and notices. | [Docs](https://www.federalregister.gov/reader-aids/developer-resources/rest-api) | Free public API, no key in source directory. | No | No auth | None | Useful for policy monitoring. |
| FBI Wanted | Government, public safety | FBI Wanted data. | [API](https://www.fbi.gov/wanted/api) | Free public API, no key in source directory. | No | No auth | None | Public law-enforcement data. |
| SEC EDGAR Data | Finance, filings | SEC company filings and submissions data. | [Docs](https://www.sec.gov/edgar/sec-api-documentation) | No key; SEC requires fair access behavior and descriptive User-Agent. | No | No auth | None | Keep under SEC fair-access limits, commonly 10 requests/sec/IP. |
| Fiscal Data / Treasury | Finance, government | US Treasury fiscal datasets. | [Docs](https://fiscaldata.treasury.gov/api-documentation/) | Free public API, no key in source directory. | No | No auth | None | Excellent for macro/fiscal datasets. |
| World Bank | Open data, economics | World development indicators and country data. | [Docs](https://datahelpdesk.worldbank.org/knowledgebase/topics/125589) | Free public API, no key in source directory. | No | No auth | None | Good for economics dashboards. |
| Econdb | Finance, macro data | Global macroeconomic data API. | [API](https://www.econdb.com/api/) | Free public API, no key in source directory. | No | No auth | None | Useful FRED-like complement. |
| arXiv | Research, AI data | Search and retrieve arXiv paper metadata. | [Docs](https://arxiv.org/help/api/user-manual) | Free public API, no key in source directory. | No | No auth | None | Good for AI/research agents. |
| Crossref Metadata | Research, books/data | Scholarly article and DOI metadata. | [Docs](https://github.com/CrossRef/rest-api-doc) | Free public API, no key in source directory; polite pool encouraged via mailto. | No | No auth | None | Add contact email in requests for better treatment. |
| Open Library | Books, data | Book metadata, authors, covers, and subjects. | [Docs](https://openlibrary.org/developers/api) | Free public API, no key in source directory. | No | No auth | None | Great for reading apps. |
| Gutendex | Books, data | Project Gutenberg book metadata API. | [Docs](https://gutendex.com/) | Free public API, no key in source directory. | No | No auth | None | Useful for public-domain reading/TTS. |
| Wikipedia API | Open data, knowledge | MediaWiki API for Wikipedia content and metadata. | [Docs](https://www.mediawiki.org/wiki/API:Main_page) | Free public API, no key for read calls. | No | No auth | None | Respect Wikimedia etiquette and User-Agent guidance. |
| Wikidata API | Open data, knowledge graph | Structured knowledge graph data and SPARQL endpoints. | [Docs](https://www.wikidata.org/w/api.php?action=help) | Free public API for read use; auth only for write/user actions. | No | No auth | None | Great for agents and enrichment pipelines. |
| Free Dictionary | Dictionaries, text | Word definitions, phonetics, examples, and synonyms. | [API](https://dictionaryapi.dev/) | Free public API, no key in source directory. | No | No auth | None | Useful for language/reading tools. |
| Wiktionary API | Dictionaries, text | Collaborative dictionary data via MediaWiki API. | [API](https://en.wiktionary.org/w/api.php) | Free public API for read use. | No | No auth | None | Respect Wikimedia etiquette. |
| Open Food Facts | Food, data | Food product database and nutrition metadata. | [Data](https://world.openfoodfacts.org/data) | Free public/open data, no key in source directory. | No | No auth | None | Good for barcode/nutrition apps. |
| Open Brewery DB | Data, food/drink | Brewery, cidery, and bottle-shop data. | [API](https://www.openbrewerydb.org) | Free public API, no key in source directory. | No | No auth | None | Good demo dataset. |
| MusicBrainz | Music, data | Open music metadata database. | [Docs](https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2) | Free public API, no key in source directory. | No | No auth | None | Use a proper User-Agent and rate politely. |
| Radio Browser | Music, data | Internet radio station directory. | [API](https://api.radio-browser.info/) | Free public API, no key in source directory. | No | No auth | None | Good for audio apps. |
| Hacker News API | Social, developer data | Official Firebase-backed HN stories, users, and comments. | [Docs](https://github.com/HackerNews/API) | Free public API, no key in source directory. | No | No auth | None | Great for news/agent demos. |
| APIs.guru | Developer tools | OpenAPI/Swagger specs for public APIs. | [Docs](https://apis.guru/api-doc/) | Free public API, no key in source directory. | No | No auth | None | Useful to discover API schemas. |
| npm Registry | Developer tools | Node package metadata and downloads. | [Docs](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md) | Free public registry API, no key for public package metadata. | No | No auth | None | Great for dependency intelligence. |
| jsDelivr Data API | Developer tools | Package metadata and CDN statistics. | [Docs](https://github.com/jsdelivr/data.jsdelivr.com) | Free public API, no key in source directory. | No | No auth | None | Useful for package/CDN analysis. |
| CDNJS | Developer tools | Library metadata on cdnjs. | [API](https://api.cdnjs.com/libraries/jquery) | Free public API, no key in source directory. | No | No auth | None | Good for frontend tooling. |
| HTTPbin | Developer tools | HTTP request/response testing service. | [API](https://httpbin.org/) | Free public API, no key in source directory. | No | No auth | None | Useful for testing clients/webhooks. |
| Postman Echo | Developer tools | Echo server for testing HTTP methods and payloads. | [API](https://www.postman-echo.com) | Free public API, no key in source directory. | No | No auth | None | Useful for API debugging. |
| JSONPlaceholder | Test data, developer tools | Fake REST API for prototyping. | [API](http://jsonplaceholder.typicode.com/) | Free public API, no key in source directory. | No | No auth | None | Good for frontend demos; source URL is HTTP. |
| FakerAPI | Test data | Fake data collections for apps and tests. | [Docs](https://fakerapi.it/en) | Free public API, no key in source directory. | No | No auth | None | Good mock data source. |
| RandomUser | Test data | Random user profile generator. | [API](https://randomuser.me) | Free public API, no key in source directory. | No | No auth | None | Good UI seed data. |
| QuickChart | Developer tools, charts | Generates charts and graphs as images. | [Docs](https://quickchart.io/) | Free public API, no key in source directory. | No | No auth | None | Good for reports and bots. |
| Kroki | Developer tools, diagrams | Renders diagrams from text definitions. | [API](https://kroki.io) | Free public API, no key in source directory. | No | No auth | None | Mermaid/Graphviz/PlantUML style rendering. |
| Image-Charts | Developer tools, charts | Chart, QR code, and graph image generation. | [Docs](https://documentation.image-charts.com/) | Free no-key use in source directory; paid plans for higher/commercial use. | No | No auth | None | Good simple chart images. |
| QR code / goqr | Developer tools | Generates and decodes QR codes. | [API](http://goqr.me/api/) | Free public API, no key in source directory. | No | No auth | None | Verify HTTPS before production. |
| URLhaus | Security | Malware URL database API. | [Docs](https://urlhaus-api.abuse.ch/) | Free public API, no key in source directory. | No | No auth | None | Good threat-intel starter. |
| Have I Been Pwned Pwned Passwords | Security | Checks whether password hashes appear in breach corpuses without sending full password. | [Docs](https://haveibeenpwned.com/API/V3) | Free, no subscription, no auth, no rate limit for Pwned Passwords API. | No | No auth | None | Do not use email-account breach API without paid key. |
| NVD API | Security, CVE data | US National Vulnerability Database CVE data. | [Docs/key info](https://nvd.nist.gov/general/news/API-Key-Announcement) | No key supported with lower limits; API key is free and increases request rate. | No | No auth | `NVD_API_KEY` optional | Use key for serious CVE polling. |
| Mozilla HTTP Observatory | Security | Scans HTTP security headers/configuration. | [Docs](https://github.com/mozilla/http-observatory/blob/master/httpobs/docs/api.md) | Free public API, no key in source directory. | No | No auth | None | Useful website security scoring. |
| PhishStats | Security | Phishing database/feed. | [API](https://phishstats.info/) | Free public API, no key in source directory. | No | No auth | None | Check terms before commercial automation. |
| UK Police | Security, open data | UK crime and police data. | [Docs](https://data.police.uk/docs/) | Free public API, no key in source directory. | No | No auth | None | UK public safety data. |
| OpenSanctions | Open data, compliance | Sanctions, PEP, crime, and risk-related entity data. | [Docs](https://www.opensanctions.org/docs/api/) | Free public data/API access available; check license for commercial use. | No | No auth | None | Strong for compliance/risk enrichment. |
| SpaceX API | Science, space data | Launches, rockets, capsules, ships, and company data. | [Docs](https://github.com/r-spacex/SpaceX-API) | Free public API, no key in source directory. | No | No auth | None | Great data demo API. |
| Launch Library 2 | Science, space data | Space launch and event database. | [API](https://thespacedevs.com/llapi) | Free public API, no key in source directory. | No | No auth | None | Good for launch trackers. |

## 2. Free API key, no credit card confirmed

These need signup but official docs/pricing either explicitly say no credit card, show a free account/key path without billing, or are public/government key systems.

| Service | Category | What it does | API/key link | Free tier details | Credit card required | Key status | Suggested env var | Setup notes |
|---|---|---|---|---|---|---|---|---|
| Google AI Studio / Gemini API | AI/LLM, multimodal, agents | Gemini text, vision, audio, embeddings, TTS/live APIs, search grounding, and tool use. | [Pricing](https://ai.google.dev/pricing) / [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) | Free tier in eligible countries; examples include Gemini 2.5 Flash-Lite 15 RPM/1,000 RPD and Gemini 2.5 Flash 10 RPM/250 RPD on free tier. | No for free tier | Needs signup | `GOOGLE_API_KEY` | Create key in AI Studio. Do not expose browser-side for serious apps. |
| Groq | AI/LLM, speech | Very fast hosted inference for open models and Whisper STT. | [Rate limits](https://console.groq.com/docs/rate-limits) | Free plan with model-specific limits, e.g. many text models around 30 RPM; Whisper large v3 20 RPM/2,000 RPD with audio-second caps. | No | Needs signup | `GROQ_API_KEY` | Create project/API key in Groq Console. Good first LLM key. |
| OpenRouter | AI/LLM aggregator | One API for many LLM providers, including free model variants. | [Limits](https://openrouter.ai/docs/api-reference/limits/) / [pricing](https://openrouter.ai/pricing) | Free model variants: 20 RPM; 50 free-model requests/day before buying credits; 1,000/day after buying at least $10 credits. | No for free models | Needs signup | `OPENROUTER_API_KEY` | Use `openrouter/free` or `:free` models for no-cost experiments. |
| GitHub Models | AI/LLM, developer tools | Model playground and API access through GitHub/Azure model catalog. | [Billing](https://docs.github.com/en/billing/concepts/product-billing/github-models) | All GitHub accounts get rate-limited free usage; paid usage is opt-in. | No for included quota | Needs signup | `GITHUB_TOKEN` | Uses GitHub auth/PAT. Not intended for production without paid/expanded setup. |
| Hugging Face Inference Providers | AI/LLM, ML | Hosted inference routed through Hugging Face across multiple providers. | [Pricing](https://huggingface.co/docs/api-inference/en/pricing) | Free users receive $0.10 monthly credits; PRO users $2.00 monthly credits. | No for free credits | Needs signup | `HF_TOKEN` | Tiny but useful for smoke tests and demos. |
| Cloudflare Workers AI | AI/LLM, edge inference | Serverless AI inference at Cloudflare edge. | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 10,000 neurons/day free on Workers Free; paid plan needed above daily free allocation. | No for Workers Free | Needs signup | `CLOUDFLARE_API_TOKEN` | Create Cloudflare account, enable Workers AI, make scoped token. |
| Mistral La Plateforme Experiment | AI/LLM | Mistral chat, embeddings, OCR/document, and agent APIs. | [Free experiment help](https://help.mistral.ai/en/articles/450104-how-can-i-try-the-api-for-free-with-the-experiment-plan) | Free Experiment plan; requires verified phone number; restrictive free rate limits. | No | Needs signup | `MISTRAL_API_KEY` | Activate Experiment plan in La Plateforme. Requests may be used for training. |
| Cohere Trial API key | AI/LLM, embeddings, rerank | Chat, embed, rerank, classify, and tokenize APIs. | [Rate limits](https://docs.cohere.com/v2/docs/rate-limits) | Trial keys are free, limited to 1,000 calls/month; chat trial rate about 20/min. | No | Needs signup | `COHERE_API_KEY` | Trial keys are not for production/commercial use. |
| Cerebras Inference | AI/LLM | Very fast LLM inference API on Cerebras hardware. | [Pricing](https://www.cerebras.ai/pricing) | Official pricing has Free tier with community support and access to Cerebras-powered models. | No | Needs signup | `CEREBRAS_API_KEY` | Good for fast free open-model experiments. |
| Deepgram | Speech, STT/TTS | Speech-to-text, text-to-speech, and voice agent APIs. | [Pricing](https://deepgram.com/pricing) | $200 free credit; no minimums and no expiration; pricing page says no credit card required. | No | Needs signup | `DEEPGRAM_API_KEY` | Strong option for STT and low-latency voice apps. |
| AssemblyAI | Speech, STT | Speech-to-text, streaming transcription, and audio intelligence. | [Pricing](https://www.assemblyai.com/pricing/) | Free offer includes $50 credits; pricing page says add card only to add more credits. | No | Needs signup | `ASSEMBLYAI_API_KEY` | Good for batch STT and audio intelligence. |
| Speechify API | Speech, TTS | Speechify Simba TTS API with many voices and languages. | [API pricing](https://speechify.com/pricing-api/) | Starter is free: 50,000 characters, 100 minutes TTS, 50+ languages, 1,000+ preset voices; no voice cloning. | No | Needs signup | `SPEECHIFY_API_KEY` | Use for TTS experiments; upgrade for voice cloning/commercial scale. |
| Geoapify | Maps, geocoding | Geocoding, places, routing, isochrones, maps, and geospatial APIs. | [Pricing](https://www.geoapify.com/pricing/) | Free plan: 3,000 credits/day, up to 5 req/sec, multiple API keys; official page says no credit card required. | No | Needs signup | `GEOAPIFY_API_KEY` | Good default maps/geocoding key. |
| OpenCage | Maps, geocoding | Forward/reverse geocoding and geosearch using open data. | [Pricing](https://opencagedata.com/pricing) | Free trial: 2,500 requests/day, 1 req/sec, no credit card required, testing only. | No | Needs signup | `OPENCAGE_API_KEY` | Free trial is for testing, not production dependency. |
| LocationIQ | Maps, geocoding | Geocoding, routing, static maps, and map tiles. | [Pricing](https://locationiq.com/pricing) | Free sign-up: 5,000 requests/day, 2 req/sec, 60/min; limited commercial use with attribution. | No | Needs signup | `LOCATIONIQ_API_KEY` | Add required attribution if using free tier commercially. |
| AbuseIPDB | Security, threat intel | IP reputation checking and abuse reporting. | [Pricing](https://www.abuseipdb.com/pricing) / [docs](https://docs.abuseipdb.com/) | Individual plan is free forever, no credit card required; 1,000 IP checks/reports/day. | No | Needs signup | `ABUSEIPDB_API_KEY` | Good free IP reputation key. |
| VirusTotal Public API | Security, malware/URL intel | File, URL, domain, and IP reputation/scan data. | [Docs](https://docs.virustotal.com/docs/api-overview) | Public API is free for non-commercial/public apps; 500 requests/day and 4 requests/min. | No | Needs signup | `VIRUSTOTAL_API_KEY` | Must not use in commercial products or as AV replacement. |
| urlscan.io | Security, web scanning | URL scanning, screenshoting, and public scan search. | [Pricing](https://urlscan.io/pricing) / [API docs](https://urlscan.io/docs/api/) | Free API plan: 50 private scans/day, 1,000 unlisted scans/day, 5,000 public scans/day, 1,000 search requests/day. | No | Needs signup | `URLSCAN_API_KEY` | Use correct scan visibility to avoid leaking sensitive URLs. |
| GreyNoise Community API | Security, threat intel | Checks whether an IP is scanning/noise/RIOT in GreyNoise. | [Community docs](https://docs.greynoise.io/docs/using-the-greynoise-community-api) | Free/community use: 50 searches/week across Community API and Visualizer. | No | No auth or signup | `GREYNOISE_API_KEY` optional | Unauthenticated lookup exists; key/account helps track quota. |
| NASA APIs | Space, science data | NASA imagery, astronomy, Earth, and space APIs. | [NASA API auth](https://api.nasa.gov/assets/html/authentication.html) | Own key: default 1,000 requests/hour; official `DEMO_KEY`: 30/hour and 50/day. | No | Public demo key / Needs signup | `NASA_API_KEY` | Use `DEMO_KEY` only for initial exploration. |
| api.data.gov | Government data | Shared API key system for many US federal APIs. | [Developer manual](https://api.data.gov/docs/developer-manual/) | Own key: default 1,000 requests/hour; official `DEMO_KEY`: 30/hour and 50/day. | No | Public demo key / Needs signup | `DATA_GOV_API_KEY` | One key can work across participating federal APIs. |
| NREL Developer APIs | Energy, environment | National Renewable Energy Lab APIs such as PVWatts and alt-fuel stations. | [Rate limits](https://developer.nrel.gov/docs/rate-limits/) | Own key: default 1,000 requests/hour; official `DEMO_KEY`: 30/hour and 50/day. | No | Public demo key / Needs signup | `NREL_API_KEY` | Good for solar/energy/EV projects. |
| FRED | Finance, economics | Federal Reserve economic time-series API. | [API keys](https://fred.stlouisfed.org/docs/api/fred/v2/api_key.html) | Free API key required for web service requests. | No | Needs signup | `FRED_API_KEY` | Requires free FRED account login. |
| Alpha Vantage | Finance, data | Stocks, forex, crypto, fundamentals, indicators, and news sentiment. | [Free key/support](https://www.alphavantage.co/support/) | Free key: official support page says most datasets up to 25 requests/day. | No | Needs signup | `ALPHA_VANTAGE_API_KEY` | Very useful but very low free daily limit. |
| Financial Modeling Prep | Finance, data | Financial statements, stock data, news, fundamentals, and ratios. | [Pricing](https://site.financialmodelingprep.com/pricing-plans) | Basic free: 250 calls/day, EOD historical data, profile/reference data, 150+ endpoints. | No | Needs signup | `FMP_API_KEY` | Good finance data starter key. |
| CoinMarketCap | Crypto, data | Crypto market data, rankings, listings, quotes, and exchange reserve data. | [Pricing](https://coinmarketcap.com/api/pricing/) | Basic free: 15,000 call credits/month, 50 req/min, personal use, no subscription required. | No | Needs signup | `COINMARKETCAP_API_KEY` | Check license before commercial use. |
| Twelve Data | Finance, market data | Stocks, forex, crypto, technical indicators, and WebSocket data. | [Pricing](https://twelvedata.com/pricing) | Basic free: 8 API credits/minute, 800/day, 8 trial WS credits; student discounts listed. | No | Needs signup | `TWELVE_DATA_API_KEY` | Good for finance projects; credit weights vary by endpoint. |
| CoinGecko Demo API | Crypto, data | Crypto prices, market data, exchanges, and metadata. | [API page](http://www.coingecko.com/api) | Demo/free access exists; current exact quota can vary by plan and attribution rules. | No | Needs signup | `COINGECKO_API_KEY` | Verify current demo quota in dashboard before relying on it. |
| CoinPaprika | Crypto, data | Cryptocurrency market data and historical prices. | [API](https://api.coinpaprika.com) | Free public and/or free key options vary by endpoint; no card needed for basic use. | No | No auth / Needs signup | `COINPAPRIKA_API_KEY` optional | Public endpoints are good for simple crypto lookups. |
| The Guardian Open Platform | News, data | Guardian content search and article metadata. | [Developer page](http://open-platform.theguardian.com/) | Free developer key available; quota varies by access tier. | No | Needs signup | `GUARDIAN_API_KEY` | Good for news apps with sources. |
| New York Times Developer | News, data | NYT article/search/books/archive APIs. | [Developer portal](https://developer.nytimes.com/) | Free developer API keys available with per-API limits. | No | Needs signup | `NYTIMES_API_KEY` | Useful for news/research projects. |
| NewsAPI | News, data | Headlines and news search from many sources. | [API](https://newsapi.org/) | Free developer plan exists for development/non-commercial use; production requires paid plan. | No | Needs signup | `NEWSAPI_KEY` | Dev-only free tier; not for public production apps. |
| GNews | News, data | News search and top headlines API. | [API](https://gnews.io/) | Free plan exists with limited requests; exact current quota should be checked in dashboard. | No | Needs signup | `GNEWS_API_KEY` | Good lightweight alternative to NewsAPI. |
| National Park Service | Government, places | US National Park Service parks, alerts, events, and visitor data. | [Developer page](https://www.nps.gov/subjects/developer/) | Free API key through NPS/data.gov-style signup. | No | Needs signup | `NPS_API_KEY` | Good travel/geodata source. |
| openFDA | Health, government data | Public FDA data about drugs, devices, and foods. | [API](https://open.fda.gov) | API key optional/recommended for higher rate limits; no card. | No | Needs signup optional | `OPENFDA_API_KEY` | Strong public health/data source. |
| US Census API | Government, demographics | US Census datasets and geographic/demographic data. | [Developer page](https://www.census.gov/data/developers/data-sets.html) | Free; key optional/used for higher limits on many endpoints. | No | Needs signup optional | `CENSUS_API_KEY` | Essential for US demographic apps. |

## 3. Free tier, credit card required or unclear

These are still useful, but either paid billing is involved, a card requirement is not obvious from the public page, or the free tier is mostly trial/evaluation.

| Service | Category | What it does | API/key link | Free tier details | Credit card required | Key status | Suggested env var | Setup notes |
|---|---|---|---|---|---|---|---|---|
| OpenAI API | AI/LLM, agents, speech, vision | GPT models, embeddings, moderation, image, realtime, transcription, TTS, and tools. | [Pricing](https://platform.openai.com/docs/pricing/) / [rate limits](https://platform.openai.com/docs/guides/rate-limits/usage-tiers%20.class) | API is pay-as-you-go for most models; moderation is free of charge; free usage tier/rate limits do not mean free credits for every model. | Yes/Unclear | Needs signup | `OPENAI_API_KEY` | Add billing only when ready; set hard project budgets. |
| Anthropic API | AI/LLM, agents | Claude models for text, vision, reasoning, and tool use. | [Pricing](https://www.anthropic.com/pricing) | Free Claude chat exists; API generally requires console/billing or credits depending on account. | Unclear | Needs signup | `ANTHROPIC_API_KEY` | Worth knowing, but not a dependable free API-key source. |
| Together AI | AI/LLM, open models | Hosted open-source LLM inference, fine-tuning, batch, and evals. | [Billing docs](https://docs.together.ai/docs/billing) | Official billing docs say no current free trials; platform access requires a minimum $5 credit purchase. | Yes | Needs signup | `TOGETHER_API_KEY` | Good provider, but not free as of checked docs. |
| Fireworks AI | AI/LLM, open models | Fast serverless inference and fine-tuning for open/proprietary models. | [Pricing](https://fireworks.ai/pricing) | $1 in free credits for serverless inference; postpaid billing after. | Unclear | Needs signup | `FIREWORKS_API_KEY` | Nice low-cost trial, but not a big free tier. |
| Replicate | AI/ML, image/video/audio | Runs thousands of ML models by API, often billed per second or per input/output. | [Pricing](https://replicate.com/pricing) | Pay only for use; no standing official free quota found on pricing page. | Unclear/likely | Needs signup | `REPLICATE_API_TOKEN` | Useful for image/video models; set spend limits. |
| Perplexity API | AI search, agents | Sonar/search/agentic research APIs with citations and web retrieval. | [Pricing](https://docs.perplexity.ai/getting-started/pricing) | API pricing is paid per tokens/tools/search requests; no official free API tier found in docs. | Yes/Unclear | Needs signup | `PERPLEXITY_API_KEY` | Great for research agents, but budget it. |
| Cartesia | Speech, STT/TTS | Low-latency voice AI, TTS, STT, and agents. | [Pricing](https://cartesia.ai/pricing) | Free plan: 20K model credits, $1 prepaid for agents; card requirement unclear. | Unclear | Needs signup | `CARTESIA_API_KEY` | Good voice-agent candidate. |
| ElevenLabs | Speech, TTS/STT | TTS, STT, voice design, voice cloning, dubbing, and audio generation. | [API pricing](https://elevenlabs.io/pricing/api/) | API included even on free plan; free/pay-as-you-go table shows included characters/hours. | Unclear | Needs signup | `ELEVENLABS_API_KEY` | Free plan is usable; commercial rights require paid tiers. |
| Google Cloud Speech/TTS/Natural Language | Speech, NLP | Google Cloud STT, TTS, translation/NLP and related APIs. | [Speech pricing](https://cloud.google.com/speech-to-text/pricing) | Google Cloud has free credits/free quotas, but many APIs require Cloud project/billing. | Yes/Unclear | Needs signup | `GOOGLE_APPLICATION_CREDENTIALS` | Use Gemini API first if you want no-billing Google AI. |
| Azure AI Speech | Speech, STT/TTS | Enterprise STT/TTS, realtime/batch transcription, voice synthesis. | [Speech pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) | Free monthly quotas are available on F0/free tier, but Azure account setup may request card unless using Azure for Students. | Unclear | Needs signup | `AZURE_SPEECH_KEY` | Strong production choice; check Azure for Students. |
| AWS Transcribe / Polly | Speech, STT/TTS | AWS speech transcription and TTS services. | [Transcribe pricing](https://aws.amazon.com/transcribe/pricing/) / [Polly pricing](https://aws.amazon.com/polly/pricing) | AWS Free Tier applies for new accounts; card is commonly required. | Yes | Needs signup | `AWS_ACCESS_KEY_ID` | Useful if you already use AWS. Set budgets/alerts. |
| IBM Text to Speech | Speech, TTS | IBM Watson text-to-speech. | [Docs](https://cloud.ibm.com/docs/text-to-speech/getting-started.html) | Lite/free tiers have existed; current quota/card requirement should be checked in IBM Cloud. | Unclear | Needs signup | `IBM_TTS_API_KEY` | Good fallback TTS provider. |
| Cloudmersive NLP/OCR/Conversion | OCR, NLP, conversion | NLP, image recognition, document conversion, validation, OCR-like workflows. | [NLP API](https://www.cloudmersive.com/nlp-api) | Free developer key/limited calls have existed; exact current quota/card unclear. | Unclear | Needs signup | `CLOUDMERSIVE_API_KEY` | Useful Swiss-army API but verify current free calls. |
| WeatherAPI.com | Weather | Current, forecast, astronomy, air quality, IP, marine, sports, and weather maps. | [Pricing](https://www.weatherapi.com/pricing.aspx) | Free: 100K calls/month, 3-day forecast, current/hourly/daily, limited AQI/alerts/sports. | Unclear | Needs signup | `WEATHERAPI_KEY` | Very practical weather key. |
| OpenWeather | Weather | Current weather, forecasts, history, maps, alerts, and One Call API. | [Pricing](https://openweathermap.org/price) | One Call 3.0: first 1,000 API calls/day free; pay-per-call beyond. | Yes/Unclear | Needs signup | `OPENWEATHER_API_KEY` | Set call cap/billing safeguards. |
| Visual Crossing Weather | Weather | Historical, forecast, timeline weather data. | [API](https://www.visualcrossing.com/weather-api) | Free tier exists historically; current quota/card requirement should be checked. | Unclear | Needs signup | `VISUAL_CROSSING_API_KEY` | Good historical weather option. |
| Tomorrow.io | Weather | Weather forecast/insights API. | [Docs](https://docs.tomorrow.io) | Free tier exists historically; current quota/card requirement should be checked. | Unclear | Needs signup | `TOMORROW_API_KEY` | Good if you need commercial weather workflows. |
| Weatherbit | Weather | Weather forecasts, historical data, and air quality. | [API](https://www.weatherbit.io/api) | Free tier exists historically; current quota/card requirement should be checked. | Unclear | Needs signup | `WEATHERBIT_API_KEY` | Alternative weather provider. |
| AQICN | Weather, air quality | Air Quality Index API for global cities. | [API](https://aqicn.org/api/) | Free token available; exact production limits/terms unclear. | Unclear | Needs signup | `AQICN_API_TOKEN` | Good AQI overlay data. |
| OpenUV | Weather, UV | Real-time UV index forecasts. | [API](https://www.openuv.io) | Free tier historically limited; current quota/card unclear. | Unclear | Needs signup | `OPENUV_API_KEY` | Use when UV is central to app. |
| Mapbox | Maps | Maps, geocoding, routing, tiles, search, and navigation APIs. | [Docs](https://docs.mapbox.com/) | Free monthly allowances exist but vary by API; card/billing requirement unclear by account. | Unclear | Needs signup | `MAPBOX_TOKEN` | Great UI maps provider; lock token scopes. |
| HERE Maps | Maps | Maps, geocoding, routing, traffic, and places. | [Developer portal](https://developer.here.com) | Freemium developer plan exists; exact free quota/card requirement should be checked. | Unclear | Needs signup | `HERE_API_KEY` | Good Google Maps alternative. |
| TomTom | Maps | Maps, geocoding, routing, places, and traffic APIs. | [Developer portal](https://developer.tomtom.com/) | Free daily transaction allowances historically exist; current terms/card unclear. | Unclear | Needs signup | `TOMTOM_API_KEY` | Good route/geocode option. |
| Google Maps Platform | Maps | Maps, geocoding, places, routes, elevation, and location APIs. | [Developer docs](https://developers.google.com/maps/) | Free monthly usage/credits vary by API; billing setup commonly required. | Yes | Needs signup | `GOOGLE_MAPS_API_KEY` | Restrict API key by referrer/IP and enabled APIs. |
| Bing Maps | Maps | Microsoft maps and geospatial APIs. | [Portal](https://www.microsoft.com/maps/) | Free/basic keys exist historically; licensing is shifting toward Azure Maps. | Unclear | Needs signup | `BING_MAPS_KEY` | Consider Azure Maps for new builds. |
| GraphHopper | Maps, routing | Routing, route optimization, geocoding, matrix APIs. | [Docs/pricing](https://docs.graphhopper.com/) | Free/developer allowance historically exists; current quota/card unclear. | Unclear | Needs signup | `GRAPHHOPPER_API_KEY` | Strong routing/optimization option. |
| Geocod.io | Maps, geocoding | US/Canada geocoding, reverse geocoding, and enrichment. | [API](https://www.geocod.io/) | Free trial historically available; current quota/card unclear. | Unclear | Needs signup | `GEOCODIO_API_KEY` | Great US address geocoding. |
| Finnhub | Finance, market data | Stock, forex, crypto, company, sentiment, and alternative data. | [Docs](https://finnhub.io/docs/api) | Free tier historically 60 API calls/min; exact current card requirement unclear. | Unclear | Needs signup | `FINNHUB_API_KEY` | Good broad finance API. |
| Polygon.io | Finance, market data | Stocks, options, forex, crypto, and market data. | [API](https://polygon.io/) | Free/basic plan exists historically; card/current quota unclear. | Unclear | Needs signup | `POLYGON_API_KEY` | Great if you need market data quality. |
| Marketstack | Finance, market data | Real-time, intraday, and historical market data. | [API](https://marketstack.com/) | Free tier exists historically; current quota/card unclear. | Unclear | Needs signup | `MARKETSTACK_API_KEY` | Check exchange data licensing. |
| ExchangeRate-API | Currency | Exchange rates and currency conversion. | [API](https://www.exchangerate-api.com) | Free key tier exists historically; exact current quota/card unclear. | Unclear | Needs signup | `EXCHANGERATE_API_KEY` | Useful for currency conversion. |
| CurrencyFreaks | Currency | Current and historical exchange rates. | [API](https://currencyfreaks.com/) | Source HTML says free plan 1K requests/month; current card requirement unclear. | Unclear | Needs signup | `CURRENCYFREAKS_API_KEY` | Lightweight currency API. |
| CloudConvert | File conversion | Converts documents, images, audio, video, ebooks, archives, spreadsheets, and presentations. | [Docs](https://cloudconvert.com/api/v2) | Free credits/minutes historically available; current quota/card unclear. | Unclear | Needs signup | `CLOUDCONVERT_API_KEY` | Strong hosted file conversion provider. |
| iLovePDF | File conversion, PDF | PDF conversion, merge, split, extract text, and page operations. | [Developer portal](https://developer.ilovepdf.com/) | Source HTML says free for 250 documents/month. | Unclear | Needs signup | `ILOVEPDF_PUBLIC_KEY` | Also needs secret key; never expose client-side. |
| Filestack | File upload/conversion | File upload, transform, and CDN workflows. | [API](https://www.filestack.com) | Free/dev tier historically available; current quota/card unclear. | Unclear | Needs signup | `FILESTACK_API_KEY` | Useful if file ingestion is central. |
| Remove.bg | Image tools | Background removal API. | [API](https://www.remove.bg/api) | Free preview/limited credits historically available; current quota/card unclear. | Unclear | Needs signup | `REMOVEBG_API_KEY` | Great for image workflows. |
| Pexels | Media data | Free stock photo/video search API. | [API](https://www.pexels.com/api/) | Free API key available, rate limits vary. | Unclear | Needs signup | `PEXELS_API_KEY` | Useful for visual assets. |
| Pixabay | Media data | Photo/video/audio media search API. | [API](https://pixabay.com/api/docs/) | Free API key available, rate limits vary. | Unclear | Needs signup | `PIXABAY_API_KEY` | Useful image/video data. |
| Hunter | Email/dev tools | Domain search, email finder, author finder, and verifier. | [API](https://hunter.io/api) | Free account/limited searches historically available; current quota/card unclear. | Unclear | Needs signup | `HUNTER_API_KEY` | Good sales/data enrichment API. |
| Tomba | Email/dev tools | B2B email finder and verifier. | [API](https://tomba.io/api) | Free tier historically available; current quota/card unclear. | Unclear | Needs signup | `TOMBA_API_KEY` | Verify data/privacy terms. |
| SendGrid | Email/dev tools | Transactional email API. | [Docs](https://docs.sendgrid.com/api-reference/) | Free tier historically available; current quota/card unclear. | Unclear | Needs signup | `SENDGRID_API_KEY` | Essential if your app sends email. |
| Mailtrap | Email/dev tools | Email testing and sending API. | [Docs](https://mailtrap.docs.apiary.io/) | Free tier historically available; current quota/card unclear. | Unclear | Needs signup | `MAILTRAP_API_KEY` | Good dev/staging email testing. |
| GitHub REST API | Developer tools | GitHub repositories, issues, PRs, code, users, and automation. | [Docs](https://docs.github.com/en/rest) | Unauthenticated low-rate use; free PAT/account for higher authenticated limits. | No/Unclear | Needs signup optional | `GITHUB_TOKEN` | Create fine-grained PAT or GitHub App for production. |
| GitLab API | Developer tools | GitLab project, issue, CI/CD, user, and repository automation. | [Docs](https://docs.gitlab.com/ee/api/) | Free account tokens; limits depend on GitLab.com/self-hosted plan. | No/Unclear | Needs signup | `GITLAB_TOKEN` | Use project/group scoped token. |
| Netlify API | Developer tools | Sites, deploys, DNS, forms, and account automation. | [Docs](https://docs.netlify.com/api/get-started/) | Free account/API token; usage depends on plan. | No/Unclear | Needs signup | `NETLIFY_AUTH_TOKEN` | Useful if hosting frontend on Netlify. |
| Docker Hub API | Developer tools | Docker Hub repositories, tags, and account automation. | [Docs](https://docs.docker.com/docker-hub/api/latest/) | Free account/token; pull limits and plan limits apply. | No/Unclear | Needs signup | `DOCKERHUB_TOKEN` | Good for CI/container metadata. |
| Postman API | Developer tools | Automates Postman workspaces, collections, monitors, and APIs. | [Docs](https://www.postman.com/postman/workspace/postman-public-workspace/documentation/12959542-c8142d51-e97c-46b6-bd77-52bb66712c9a) | Free account/API key with workspace limits; exact quota depends on plan. | No/Unclear | Needs signup | `POSTMAN_API_KEY` | Good for API collection automation. |
| Shodan | Security, internet scanning | Search engine for internet-connected devices. | [Developer portal](https://developer.shodan.io/) | Free account key has very limited query credits; paid for serious use. | Unclear | Needs signup | `SHODAN_API_KEY` | Be careful with acceptable-use/security scope. |
| Censys | Security, internet scanning | Host/certificate/search API for internet exposure data. | [API](https://search.censys.io/api) | Free/community access exists; exact current quota/card unclear. | Unclear | Needs signup | `CENSYS_API_ID` | Also needs `CENSYS_API_SECRET`. |
| SecurityTrails | Security, DNS/WHOIS | Current and historical DNS/WHOIS/domain data. | [Docs](https://securitytrails.com/corp/apidocs) | Free/trial access historically available; current quota/card unclear. | Unclear | Needs signup | `SECURITYTRAILS_API_KEY` | Useful for OSINT and domain intelligence. |
| GitGuardian | Security, secret scanning | Scans files/repos for leaked secrets and credentials. | [Docs](https://api.gitguardian.com/doc) | Free tier historically available; current quota/card unclear. | Unclear | Needs signup | `GITGUARDIAN_API_KEY` | Very relevant for keeping API keys safe. |

## 4. AI/LLM APIs worth knowing in 2026 not in the HTML

This section is intentionally separate from the pasted HTML source. These are high-value AI APIs to know about in 2026.

| Service | Category | What it does | API/key link | Free tier details | Credit card required | Key status | Suggested env var | Setup notes |
|---|---|---|---|---|---|---|---|---|
| Google AI Studio / Gemini API | LLM, multimodal, agents | Best no-card starter for Google LLM/multimodal work. | [Get key](https://aistudio.google.com/app/apikey) / [pricing](https://ai.google.dev/pricing) | Free tier in eligible countries; free input/output on supported models with model-specific RPM/RPD. | No | Needs signup | `GOOGLE_API_KEY` | Recommended first key for you because you said you prefer Google. |
| Groq | LLM, STT | Ultra-fast inference for Llama/Qwen/Kimi/OpenAI OSS models and Whisper. | [Console](https://console.groq.com/) / [limits](https://console.groq.com/docs/rate-limits) | Free plan with model-specific RPM/RPD/TPM/TPD; Whisper included. | No | Needs signup | `GROQ_API_KEY` | Excellent second key for fast agents. |
| OpenRouter | LLM gateway | One API for hundreds of providers/models, including free variants. | [API keys](https://openrouter.ai/docs/api-keys) / [free router](https://openrouter.ai/docs/guides/routing/routers/free-models-router) | Free models available; free tier limited to 50 free-model requests/day until credits are purchased. | No | Needs signup | `OPENROUTER_API_KEY` | Great for model fallback/routing experiments. |
| GitHub Models | LLM/dev platform | Free, rate-limited model access tied to GitHub for prototyping. | [Billing/free use](https://docs.github.com/en/billing/concepts/product-billing/github-models) | Included free quota for all GitHub accounts; paid usage opt-in. | No | Needs signup | `GITHUB_TOKEN` | Good for code/dev experiments, not production baseline. |
| Hugging Face Inference Providers | ML/LLM gateway | Low-friction access to hosted models/providers. | [Pricing](https://huggingface.co/docs/api-inference/en/pricing) | $0.10/month free routed inference credits on free accounts. | No | Needs signup | `HF_TOKEN` | Tiny quota, but useful to learn and test. |
| Cloudflare Workers AI | Edge AI | LLMs, embeddings, image, STT/TTS-ish model routes at the edge. | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 10,000 neurons/day free allocation. | No | Needs signup | `CLOUDFLARE_API_TOKEN` | Useful if you deploy on Cloudflare. |
| Mistral La Plateforme | LLM, agents, OCR | Mistral models, agents, OCR/document APIs, embeddings. | [Free experiment](https://help.mistral.ai/en/articles/450104-how-can-i-try-the-api-for-free-with-the-experiment-plan) | Free Experiment plan with phone verification and restrictive rate limits. | No | Needs signup | `MISTRAL_API_KEY` | Strong European provider; watch data-training terms on free plan. |
| Cohere | LLM, embeddings, rerank | Chat, embeddings, reranking, classification, tokenize. | [Trial limits](https://docs.cohere.com/v2/docs/rate-limits) | Free trial key, 1,000 calls/month. | No | Needs signup | `COHERE_API_KEY` | Especially good for rerank and embeddings. |
| Cerebras Inference | LLM | Very fast inference API with a free tier. | [Pricing](https://www.cerebras.ai/pricing) | Official Free tier; community support. | No | Needs signup | `CEREBRAS_API_KEY` | Try for fast open models. |
| Deepgram | Speech AI | STT, TTS, and voice agent APIs. | [Pricing](https://deepgram.com/pricing) | $200 free credit, no credit card required. | No | Needs signup | `DEEPGRAM_API_KEY` | Best speech starter credit. |
| AssemblyAI | Speech AI | STT and audio intelligence. | [Pricing](https://www.assemblyai.com/pricing/) | $50 free credits; add card only to add more. | No | Needs signup | `ASSEMBLYAI_API_KEY` | Good STT fallback. |
| ElevenLabs | Speech AI | TTS, STT, voice design, cloning, agents. | [API pricing](https://elevenlabs.io/pricing/api/) | Free plan/API included; current public page shows included credits/hours by plan. | Unclear | Needs signup | `ELEVENLABS_API_KEY` | Great voice quality; commercial rights matter. |
| Cartesia | Speech AI | Low-latency TTS/STT/agents. | [Pricing](https://cartesia.ai/pricing) | Free plan: 20K credits for models, $1 prepaid for agents. | Unclear | Needs signup | `CARTESIA_API_KEY` | Promising for realtime voice UX. |
| Speechify API | Speech AI | Natural TTS API with Simba model. | [API pricing](https://speechify.com/pricing-api/) | Free Starter: 50K chars and 100 TTS minutes. | No | Needs signup | `SPEECHIFY_API_KEY` | Very relevant to your speech-platform project. |
| Fireworks AI | LLM/open models | Fast hosted open-model inference and fine-tuning. | [Pricing](https://fireworks.ai/pricing) | $1 free credits. | Unclear | Needs signup | `FIREWORKS_API_KEY` | Low-cost rather than really free. |
| Together AI | LLM/open models | Open-model inference, fine-tuning, batch, evals. | [Billing](https://docs.together.ai/docs/billing) | No current free trial; minimum $5 credit purchase. | Yes | Needs signup | `TOGETHER_API_KEY` | Still worth knowing for production open models. |
| Replicate | ML model hosting | Image/video/audio/LLM model inference from community and custom models. | [Pricing](https://replicate.com/pricing) | Pay-as-you-go; no official standing free quota found. | Unclear | Needs signup | `REPLICATE_API_TOKEN` | Great for niche models, but budget it. |
| Anthropic | LLM, agents | Claude models for coding, reasoning, vision, and tools. | [Pricing](https://www.anthropic.com/pricing) | Free Claude web exists; API free tier not confirmed from official pricing. | Unclear | Needs signup | `ANTHROPIC_API_KEY` | Important provider, likely paid for real API work. |
| OpenAI | LLM, agents, realtime, speech | GPT, realtime, speech, image, embeddings, moderation, and tools. | [Pricing](https://platform.openai.com/docs/pricing/) | Mostly pay-as-you-go; moderation is free; AgentKit file/image upload storage has 1GB free/month. | Yes/Unclear | Needs signup | `OPENAI_API_KEY` | Essential to know, but protect with budgets. |
| Perplexity | AI search | Search/agent APIs with citations and web retrieval. | [Pricing](https://docs.perplexity.ai/getting-started/pricing) | API is paid by model tokens and web/search tool fees. | Yes/Unclear | Needs signup | `PERPLEXITY_API_KEY` | Useful for research agents when citations matter. |

## 5. Public demo/test keys

Only use these for experiments. They are public and heavily limited. They are not private secrets.

| Service | Public key | What it unlocks | Official source | Limits | Use in env? |
|---|---|---|---|---|---|
| NASA APIs | `DEMO_KEY` | NASA/api.data.gov demo access. | [NASA auth docs](https://api.nasa.gov/assets/html/authentication.html) | 30 requests/hour/IP and 50 requests/day/IP. | Set `NASA_API_KEY=DEMO_KEY` only for throwaway tests. |
| api.data.gov | `DEMO_KEY` | Demo key for participating US federal APIs. | [api.data.gov developer manual](https://api.data.gov/docs/developer-manual/) | 30 requests/hour/IP and 50 requests/day/IP. | Set `DATA_GOV_API_KEY=DEMO_KEY` only for exploration. |
| NREL Developer APIs | `DEMO_KEY` | Demo access to NREL APIs. | [NREL rate limits](https://developer.nrel.gov/docs/rate-limits/) | 30 requests/hour/IP and 50 requests/day/IP. | Set `NREL_API_KEY=DEMO_KEY` only for exploration. |
| FRED docs example | `abcdefghijklmnopqrstuvwxyz123456` | Documentation example key only. | [FRED docs example](https://fred.stlouisfed.org/docs/api/fred/series.html) | FRED says to use a registered API key instead. | Do not rely on this; request your own free FRED key. |

## 6. Setup checklist

### Best first keys for you

| Priority | Key | Why | Setup link |
|---|---|---|---|
| 1 | `GOOGLE_API_KEY` | You said you prefer Google; Gemini free tier is strong and no-card for eligible countries. | [Google AI Studio API keys](https://aistudio.google.com/app/apikey) |
| 2 | `GROQ_API_KEY` | Fast free LLM inference plus Whisper STT. | [Groq Console](https://console.groq.com/) |
| 3 | `OPENROUTER_API_KEY` | Free model router and one API for many models. | [OpenRouter keys](https://openrouter.ai/docs/api-keys) |
| 4 | `DEEPGRAM_API_KEY` | Best no-card speech credit for STT/TTS experiments. | [Deepgram pricing/signup](https://deepgram.com/pricing) |
| 5 | `SPEECHIFY_API_KEY` | Directly relevant to your speech platform idea. | [Speechify API pricing](https://speechify.com/pricing-api/) |
| 6 | `GEOAPIFY_API_KEY` | No-card maps/geocoding with 3,000 credits/day. | [Geoapify pricing](https://www.geoapify.com/pricing/) |
| 7 | `ABUSEIPDB_API_KEY` | No-card security/reputation API with a clear free quota. | [AbuseIPDB pricing](https://www.abuseipdb.com/pricing) |
| 8 | `ALPHA_VANTAGE_API_KEY` | Easy finance API key, although only 25 requests/day free. | [Alpha Vantage free key](https://www.alphavantage.co/support/) |

### Safe local `.env` template

```bash
# AI / LLM
GOOGLE_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
GITHUB_TOKEN=
HF_TOKEN=
MISTRAL_API_KEY=
COHERE_API_KEY=
CEREBRAS_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Speech
DEEPGRAM_API_KEY=
ASSEMBLYAI_API_KEY=
SPEECHIFY_API_KEY=
ELEVENLABS_API_KEY=
CARTESIA_API_KEY=

# Weather / maps
WEATHERAPI_KEY=
OPENWEATHER_API_KEY=
GEOAPIFY_API_KEY=
OPENCAGE_API_KEY=
LOCATIONIQ_API_KEY=
MAPBOX_TOKEN=
TOMTOM_API_KEY=

# Data / finance / security
NASA_API_KEY=DEMO_KEY
DATA_GOV_API_KEY=DEMO_KEY
NREL_API_KEY=DEMO_KEY
FRED_API_KEY=
ALPHA_VANTAGE_API_KEY=
FMP_API_KEY=
COINMARKETCAP_API_KEY=
TWELVE_DATA_API_KEY=
ABUSEIPDB_API_KEY=
VIRUSTOTAL_API_KEY=
URLSCAN_API_KEY=
GREYNOISE_API_KEY=
NVD_API_KEY=
```

### Setup order

1. Create no-card AI keys first: Google AI Studio, Groq, OpenRouter, GitHub Models, Hugging Face.
2. Create no-card speech keys: Deepgram, AssemblyAI, Speechify.
3. Create no-card utility keys: Geoapify, OpenCage, AbuseIPDB, NASA/api.data.gov/NREL, Alpha Vantage, FRED.
4. Put values in a local `.env` file, but never paste private key values into chat.
5. Add provider budgets/spend caps wherever billing is enabled.
6. For frontend apps, proxy secret-key API calls through your backend. Do not expose private keys in browser JavaScript.
7. Use demo keys only for smoke tests; replace them before any app is shared.

