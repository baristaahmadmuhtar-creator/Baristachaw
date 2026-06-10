const fs = require('fs');
const filePath = 'C:/Users/Alpha/Downloads/Baristachaw/apps/web/src/features/ai-brew/workflowTutorials.ts';
let code = fs.readFileSync(filePath, 'utf-8');

// Fix batch_brew typo
code = code.replace(/renyah nan cerah/g, 'renyah dan cerah');

const newSwitchStyles = `
  hybrid_bright_clean: {
    setup: {
      en: 'Ensure the valve is closed and pre-wet the filter to wash away papery notes.',
      id: 'Pastikan katup tertutup dan basahi filter untuk membuang aroma kertas.'
    },
    entry: {
      en: 'Bloom with the valve closed to trap aromatics and saturate the bed fully.',
      id: 'Lakukan blooming dengan katup tertutup untuk menjebak aromatik dan membasahi kopi seutuhnya.'
    },
    main: {
      en: 'Open the valve and pour aggressively to lift the bed and drive bright acidity.',
      id: 'Buka katup dan tuang secara agresif untuk mengangkat kopi dan mendorong keasaman yang cerah.'
    },
    release: {
      en: 'Allow the percolation to drain completely through the filter.',
      id: 'Biarkan perkolasi meniris sepenuhnya melewati filter.'
    },
    finish: {
      en: 'Serve a clean, vibrant cup with pronounced acidity.',
      id: 'Sajikan seduhan yang bersih, ceria, dengan keasaman yang tegas.'
    }
  },
  immersion_sweet: {
    setup: {
      en: 'Lock the valve securely; we are maximizing contact time for sweetness.',
      id: 'Kunci katup dengan rapat; kita akan memaksimalkan waktu kontak demi rasa manis.'
    },
    entry: {
      en: 'Pour the full volume gently to submerge the bed without excessive turbulence.',
      id: 'Tuang seluruh volume dengan lembut untuk menenggelamkan kopi tanpa turbulensi berlebih.'
    },
    main: {
      en: 'Steep patiently; the long immersion extracts deep sugars.',
      id: 'Rendam dengan sabar; imersi yang panjang akan mengekstrak gula yang dalam.'
    },
    release: {
      en: 'Open the valve and let gravity pull the sweet liquor down.',
      id: 'Buka katup dan biarkan gravitasi menarik cairan manis ke bawah.'
    },
    finish: {
      en: 'Swirl to integrate the syrupy extraction before serving.',
      id: 'Putar perlahan untuk menyatukan ekstraksi yang kental sebelum disajikan.'
    }
  },
  immersion_heavy_body: {
    setup: {
      en: 'Keep the valve closed and prepare for a dense, full-immersion brew.',
      id: 'Biarkan katup tertutup dan bersiaplah untuk seduhan imersi penuh yang pekat.'
    },
    entry: {
      en: 'Add water quickly and stir vigorously to maximize initial extraction.',
      id: 'Tambahkan air dengan cepat dan aduk kuat untuk memaksimalkan ekstraksi awal.'
    },
    main: {
      en: 'Maintain the steep; the suspended particles will build a heavy mouthfeel.',
      id: 'Pertahankan rendaman; partikel yang tersuspensi akan membangun sensasi mulut yang berat.'
    },
    release: {
      en: 'Release the valve, filtering out only the largest particles.',
      id: 'Buka katup, menyaring hanya partikel-partikel terbesar.'
    },
    finish: {
      en: 'Enjoy a robust, heavy-bodied cup with intense flavor.',
      id: 'Nikmati secangkir kopi ber-body berat, kokoh, dengan rasa yang intens.'
    }
  },
  v60_mode: {
    setup: {
      en: 'Leave the valve open; treat the Switch strictly as a standard V60 dripper.',
      id: 'Biarkan katup terbuka; perlakukan Switch murni sebagai alat seduh V60 standar.'
    },
    entry: {
      en: 'Pour a traditional bloom, allowing gases to escape freely through the open bottom.',
      id: 'Tuang blooming tradisional, biarkan gas keluar bebas lewat celah bawah yang terbuka.'
    },
    main: {
      en: 'Pour in concentric circles to maintain a steady percolation rate.',
      id: 'Tuang dalam lingkaran konsentris untuk mempertahankan laju perkolasi yang stabil.'
    },
    release: {
      en: 'Wait for the continuous drawdown to finish without any immersion hold.',
      id: 'Tunggu fase turun kontinu selesai tanpa ada penahanan imersi sama sekali.'
    },
    finish: {
      en: 'Serve a delicate and articulate cup typical of pure percolation.',
      id: 'Sajikan cangkir yang lembut dan terartikulasi khas perkolasi murni.'
    }
  },
  iced_hybrid: {
    setup: {
      en: 'Fill the server with ice; close the valve to build a potent hot concentrate.',
      id: 'Isi wadah saji dengan es; tutup katup untuk membangun konsentrat panas yang kuat.'
    },
    entry: {
      en: 'Steep the grounds in minimal water to rapidly extract intense aromatics.',
      id: 'Rendam kopi dalam air minimal untuk mengekstrak aromatik intens dengan cepat.'
    },
    main: {
      en: 'Stir to ensure the dense concentrate is fully developed before the chill.',
      id: 'Aduk untuk memastikan konsentrat pekat berkembang sempurna sebelum pendinginan.'
    },
    release: {
      en: 'Open the valve to flash-chill the concentrate directly over the ice.',
      id: 'Buka katup untuk mendinginkan kilat konsentrat langsung di atas es.'
    },
    finish: {
      en: 'Mix well until the thermal shock is complete and the drink is ice cold.',
      id: 'Aduk rata sampai kejutan termal selesai dan minuman menjadi sangat dingin.'
    }
  },
  mugen_everyday_hybrid: {
    setup: {
      en: 'Close the valve; this Mugen-inspired method requires a single, continuous pour.',
      id: 'Tutup katup; metode terinspirasi Mugen ini butuh satu tuangan kontinu.'
    },
    entry: {
      en: 'Pour the entire water volume in one smooth motion without stopping for a separate bloom.',
      id: 'Tuang seluruh volume air dalam satu gerakan mulus tanpa berhenti untuk blooming terpisah.'
    },
    main: {
      en: 'Let the full volume steep briefly, utilizing the restricted flow geometry.',
      id: 'Biarkan seluruh volume merendam sebentar, memanfaatkan geometri aliran yang terbatas.'
    },
    release: {
      en: 'Open the valve and allow the steady, unified drawdown to complete.',
      id: 'Buka katup dan biarkan fase turun yang stabil dan menyatu selesai.'
    },
    finish: {
      en: 'Serve a reliably balanced, low-effort daily cup.',
      id: 'Sajikan secangkir kopi harian yang seimbang dan andal dengan sedikit usaha.'
    }
  },
`;

if (!code.includes('hybrid_bright_clean: {')) {
  code = code.replace(
    /const SWITCH_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = \{/,
    `const SWITCH_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {\n${newSwitchStyles}`
  );
  fs.writeFileSync(filePath, code);
  console.log('Injected missing hario_switch styles successfully.');
} else {
  console.log('Styles already exist.');
}
