# Hand-wiring for the /resources tools (applied after each converter run).
import sys
p = sys.argv[1] + '/src/components/v3/pages/resources.tsx'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b, 1)
rep('YOUR SHARE OF FAULT</span><span style={{fontSize:"26px",color:"#e8c384"}}>30%</span>',
    'YOUR SHARE OF FAULT</span><span data-tool-out="fault" style={{fontSize:"26px",color:"#e8c384"}}>30%</span>')
rep('<input type={"range"}', '<input data-tool="fault" defaultValue={30} type={"range"}')
rep('width:"70%",transition:"width .2s ease"}}>', 'width:"70%",transition:"width .2s ease"}} data-tool-out="bar">')
rep('<strong>70%</strong>', '<strong data-tool-out="recovery">70%</strong>')
rep('Reduced by 30%</span>', 'Reduced by <span data-tool-out="fault">30%</span></span>')
rep('<input type={"date"}', '<input data-tool="incident" aria-label="Date of incident" type={"date"}')
rep('Government entities</span><span style={{color:"#f0ce90"}}>6 months</span>', 'Government entities</span><span data-tool-out="gov" style={{color:"#f0ce90"}}>6 months</span>')
rep('Most injury claims</span><span style={{color:"#e8c384"}}>2 years</span>', 'Most injury claims</span><span data-tool-out="gen" style={{color:"#e8c384"}}>2 years</span>')
i = s.index('Exceptions run in both directions')
j = s.rindex('<p ', 0, i)
s = s[:j] + '<p data-tool-out="note"' + s[j + 2:]
rep('import { FIRM } from "@/lib/constants";', 'import { FIRM } from "@/lib/constants";\nimport { V3ResourceTools } from "@/components/v3/v3-resource-tools";')
rep('<div className="v3-page">', '<div className="v3-page">\n      <V3ResourceTools />')
open(p, 'w', encoding='utf8').write(s)
print('resources wired')

# Static California map (the prototype loaded d3/topojson from CDNs, which the
# site's CSP blocks). Pre-rendered to public/v3/ca-map.svg.
s = open(p, encoding='utf8').read()
a = s.index('<iframe src="/v3/ca-map.html"')
b = s.index('/>', a) + 2
s = s[:a] + '<img src="/v3/ca-map.svg" alt="Map of California cities served by MMG Law Firm" width={620} height={720} loading="lazy" style={{display:"block",width:"100%",height:"auto"}} />' + s[b:]
s = s.replace('import { FIRM } from "@/lib/constants";', '/* eslint-disable @next/next/no-img-element -- static pre-rendered SVG map */\nimport { FIRM } from "@/lib/constants";', 1)
open(p, 'w', encoding='utf8').write(s)
print('map wired')

# The static map has no hover interaction.
s = open(p, encoding='utf8').read()
s = s.replace(' Hover a region to see it on the map.', '')
open(p, 'w', encoding='utf8').write(s)
