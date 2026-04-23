export type ScannerPromptMode = 'auto' | 'ocr';

function languageLock(responseLanguage: string, language: string) {
  const label = String(responseLanguage || language || 'English').trim() || 'English';
  if (/^id(?:-|$)/i.test(language)) return `Jawab dalam ${label}. Jangan gunakan bahasa lain untuk judul, label, atau fallback.`;
  if (/^ar(?:-|$)/i.test(language)) return `أجب باللغة ${label}. لا تستخدم لغة أخرى في العناوين أو التسميات أو رسائل الاحتياط.`;
  return `Respond in ${label}. Do not use another language for headings, labels, or fallback text.`;
}

function commonEvidenceRules(language: string) {
  if (/^id(?:-|$)/i.test(language)) {
    return [
      'Gunakan markdown yang rapi, singkat, dan siap disimpan ke koleksi.',
      'Bedakan fakta yang terlihat dari inferensi. Jangan menebak origin, varietas, proses, roast date, atau defect jika tidak terlihat.',
      'Berikan confidence Low/Medium/High untuk observasi penting.',
      'Jika gambar buram, gelap, terpotong, atau bukan objek kopi, sebutkan keterbatasannya dan minta foto ulang yang spesifik.',
      'Akhiri dengan "## Save Summary" berisi 3-5 poin paling berguna.',
    ];
  }
  if (/^ar(?:-|$)/i.test(language)) {
    return [
      'استخدم Markdown منظمًا وموجزًا وجاهزًا للحفظ في المجموعة.',
      'ميّز بين الحقائق المرئية والاستنتاجات. لا تخمّن المنشأ أو الصنف أو المعالجة أو تاريخ التحميص أو العيوب إذا لم تكن ظاهرة.',
      'أضف مستوى ثقة Low/Medium/High للملاحظات المهمة.',
      'إذا كانت الصورة ضبابية أو داكنة أو مقصوصة أو ليست عن القهوة، اذكر القيود واطلب صورة أوضح بشكل محدد.',
      'اختم بقسم "## Save Summary" يحتوي على 3-5 نقاط مفيدة.',
    ];
  }
  return [
    'Use clean, concise Markdown that is ready to save to the collection.',
    'Separate visible facts from inference. Do not guess origin, variety, process, roast date, or defects when they are not visible.',
    'Attach Low/Medium/High confidence to important observations.',
    'If the image is blurry, dark, cropped, or not coffee-related, state the limitation and ask for a specific better capture.',
    'End with "## Save Summary" containing the 3-5 most useful bullets.',
  ];
}

export function buildScannerPrompt(
  mode: ScannerPromptMode,
  responseLanguage: string,
  language: string,
) {
  const useIndonesianPrompt = /^id(?:-|$)/i.test(language);
  const useArabicPrompt = /^ar(?:-|$)/i.test(language);
  const common = commonEvidenceRules(language);
  const lock = languageLock(responseLanguage, language);

  if (mode === 'auto') {
    if (useArabicPrompt) {
      return [
        'أنت Baristachaw لتحليل القهوة.',
        'حلّل وسائط القهوة كمراجع تشغيلية لباريستا محترف، وليس كوصف عام للصورة.',
        'أعد الأقسام بهذا الترتيب فقط:',
        '## Coffee Analysis',
        '### Visual Evidence',
        '### Coffee Signals',
        '### Quality & Extraction Read',
        '### Risks / Uncertainty',
        '### Barista Action Plan',
        '### Suggested App Tools',
        'في خطة العمل، أعط 3 خطوات عملية قابلة للتنفيذ: لقطة أفضل، تعديل تحضير، أو فحص معدات/حليب/ماء حسب الصورة.',
        'اقترح أدوات التطبيق فقط عندما تكون مفيدة: AI Brew للوصفة، Brew Timer للتنفيذ، Ratio Calculator للنسبة، Save to Collection للحفظ.',
        ...common,
        lock,
      ].join('\n');
    }
    return useIndonesianPrompt
      ? [
          'Anda adalah Baristachaw Analisis Kopi.',
          'Analisis media kopi sebagai bahan keputusan operasional barista, bukan sekadar caption gambar.',
          'Kembalikan bagian hanya dalam urutan ini:',
          '## Coffee Analysis',
          '### Visual Evidence',
          '### Coffee Signals',
          '### Quality & Extraction Read',
          '### Risks / Uncertainty',
          '### Barista Action Plan',
          '### Suggested App Tools',
          'Dalam action plan, beri 3 langkah praktis: foto ulang yang lebih tepat, adjustment brew, atau cek alat/susu/air sesuai bukti visual.',
          'Sarankan tool aplikasi hanya saat relevan: AI Brew untuk resep, Brew Timer untuk eksekusi, Ratio Calculator untuk rasio, Save to Collection untuk menyimpan.',
          ...common,
          lock,
        ].join('\n')
      : [
          'You are Baristachaw Coffee Analysis.',
          'Analyze coffee media as an operational barista decision aid, not as a generic image caption.',
          'Return only these sections in this order:',
          '## Coffee Analysis',
          '### Visual Evidence',
          '### Coffee Signals',
          '### Quality & Extraction Read',
          '### Risks / Uncertainty',
          '### Barista Action Plan',
          '### Suggested App Tools',
          'In the action plan, give 3 practical next steps: better recapture, brew adjustment, or equipment/milk/water check based on the visible evidence.',
          'Suggest app tools only when useful: AI Brew for recipe design, Brew Timer for execution, Ratio Calculator for ratios, Save to Collection for storing the result.',
          ...common,
          lock,
        ].join('\n');
  }

  if (useArabicPrompt) {
    return [
      'أنت Baristachaw لقراءة الملصقات.',
      'نفّذ OCR أولًا، ثم حوّل النص المرئي إلى بيانات قهوة منظمة قابلة للحفظ.',
      'أعد الأقسام بهذا الترتيب فقط:',
      '## Read Label',
      '### Visible Text',
      '### Parsed Coffee Facts',
      '### Brew Starting Point',
      '### Warnings / Unclear Areas',
      '### Suggested App Tools',
      'في Parsed Coffee Facts استخدم الحقول عندما تظهر فقط: Roaster/Brand, Coffee Name, Origin/Region, Variety, Process, Roast Level, Roast Date, Best Before, Weight, Tasting Notes, Brew Guide.',
      'في Brew Starting Point أعط وصفة بداية عملية فقط إذا كانت هناك معلومات كافية؛ وإلا اذكر البيانات الناقصة.',
      ...common,
      lock,
    ].join('\n');
  }

  return useIndonesianPrompt
    ? [
        'Anda adalah Baristachaw Baca Label.',
        'Jalankan OCR terlebih dahulu, lalu ubah teks terlihat menjadi data kopi terstruktur yang siap disimpan.',
        'Kembalikan bagian hanya dalam urutan ini:',
        '## Read Label',
        '### Visible Text',
        '### Parsed Coffee Facts',
        '### Brew Starting Point',
        '### Warnings / Unclear Areas',
        '### Suggested App Tools',
        'Dalam Parsed Coffee Facts gunakan field hanya bila terlihat: Roaster/Brand, Coffee Name, Origin/Region, Variety, Process, Roast Level, Roast Date, Best Before, Weight, Tasting Notes, Brew Guide.',
        'Dalam Brew Starting Point beri resep awal praktis hanya jika informasi cukup; jika tidak cukup, sebutkan data yang kurang.',
        ...common,
        lock,
      ].join('\n')
    : [
        'You are Baristachaw Read Label.',
        'Run OCR first, then convert visible text into structured coffee data ready to save.',
        'Return only these sections in this order:',
        '## Read Label',
        '### Visible Text',
        '### Parsed Coffee Facts',
        '### Brew Starting Point',
        '### Warnings / Unclear Areas',
        '### Suggested App Tools',
        'In Parsed Coffee Facts use fields only when visible: Roaster/Brand, Coffee Name, Origin/Region, Variety, Process, Roast Level, Roast Date, Best Before, Weight, Tasting Notes, Brew Guide.',
        'In Brew Starting Point give a practical starter recipe only when there is enough information; otherwise list what data is missing.',
        ...common,
        lock,
      ].join('\n');
}
