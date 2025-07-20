import { describe, test, expect } from '@jest/globals';
import { MusicXMLTempoExtractor } from '../../../src/main/parsers/musicXMLTempoExtractor';

describe('MusicXMLTempoExtractor', () => {
  let extractor: MusicXMLTempoExtractor;

  beforeEach(() => {
    extractor = new MusicXMLTempoExtractor();
  });

  test('should extract quarter note tempo correctly', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>120</per-minute>
          </metronome>
        </direction-type>
      </direction>
    </measure>
  </part>
</score-partwise>`;
    
    const result = extractor.extract(xml);
    expect(result).toHaveLength(1);
    expect(result[0].bpm).toBe(120);
  });

  test('should convert eighth note tempo correctly', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>eighth</beat-unit>
            <per-minute>50</per-minute>
          </metronome>
        </direction-type>
      </direction>
    </measure>
  </part>
</score-partwise>`;
    
    const result = extractor.extract(xml);
    expect(result).toHaveLength(1);
    expect(result[0].bpm).toBe(100); // 50 eighths/min = 100 quarters/min
  });

  test('should handle dotted quarter notes correctly', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <beat-unit-dot/>
            <per-minute>60</per-minute>
          </metronome>
        </direction-type>
      </direction>
    </measure>
  </part>
</score-partwise>`;
    
    const result = extractor.extract(xml);
    expect(result).toHaveLength(1);
    expect(result[0].bpm).toBe(90); // 60 * 1.5 = 90
  });

  test('should extract multiple tempos from Un Sospiro pattern', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <direction>
        <sound tempo="25"/>
      </direction>
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>eighth</beat-unit>
            <per-minute>25</per-minute>
          </metronome>
        </direction-type>
      </direction>
    </measure>
    <measure number="2">
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>eighth</beat-unit>
            <beat-unit-dot/>
            <per-minute>56.67</per-minute>
          </metronome>
        </direction-type>
      </direction>
    </measure>
  </part>
</score-partwise>`;
    
    const result = extractor.extract(xml);
    expect(result).toHaveLength(3);
    expect(result[0].bpm).toBe(25);    // Original tempo
    expect(result[1].bpm).toBe(50);    // 25 eighths * 2 = 50
    expect(Math.round(result[2].bpm)).toBe(85); // 56.67 * 1.5 ≈ 85
  });
});