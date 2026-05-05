# AI Brew Core Brewer Readiness

Dokumen ini merangkum alat seduh inti yang tampil di AI Brew dan cara planner
memperlakukan masing-masing alat. Prinsip utama: core brewer boleh mudah
dipilih user, tetapi klaim profil tetap harus jujur: exact, turunan,
eksperimental, atau butuh kalibrasi.

## Daftar Alat Seduh Inti

1. Espresso Machine
   - Status MVP: siap untuk yield/time/flow, bukan pour-over.
   - Fokus SOP: yield di cup, flow stabil, hentikan sebelum blonding agresif.
   - Risiko: butuh dial-in grinder dan distribusi puck.

2. AeroPress
   - Status MVP: siap untuk immersion pendek + press stabil.
   - Fokus SOP: preheat/rinse, wet bed merata, steep singkat, press pelan,
     jangan memaksa akhir bila hiss sudah keras.
   - Risiko: tekanan terlalu cepat membuat rasa kasar.

3. French Press
   - Status MVP: siap untuk full immersion.
   - Fokus SOP: grind lebih kasar, steep stabil, break/skim ringan bila perlu,
     press pelan, decant supaya ekstraksi berhenti.
   - Risiko: fines membuat cup berat jika dibiarkan di ampas.

4. Hario V60
   - Status MVP: core baseline paling stabil untuk cone pour-over.
   - Fokus SOP: rinse filter, bloom rapi, pour center-to-mid, jaga drawdown.
   - Risiko: channeling jika flow terlalu agresif atau bed miring.
   - Catatan: rule V60 tidak diubah dalam upgrade Hario Switch.

5. Hario Switch
   - Status MVP: dipromosikan ke core brewer sebagai hybrid immersion-release.
   - Trust UI: profil turunan dari V60 + immersion release, bukan klaim resep
     resmi pabrikan.
   - Fokus SOP: valve tertutup saat bloom/steep, top-up tertutup, lalu buka
     switch di checkpoint release tanpa swirl berat.
   - Iced: hot concentrate dilepas langsung ke es terukur, lalu server diaduk
     5-8 detik.
   - Guard UI: panduan harus menyebut Hario Switch/switch, bukan copy Clever
     generic, meskipun keduanya memakai method family immersion-release.
   - Risiko: late agitation membuat cup keruh; preheat body kaca penting.

6. Kalita Wave 155 / 185
   - Status MVP: siap untuk flat-bottom pulse.
   - Fokus SOP: bed rata, pulse pendek, spout rendah, hindari edge bypass.
   - Risiko: filter collapse atau bed tidak rata membuat flow tidak konsisten.

7. Chemex
   - Status MVP: siap untuk thick-filter pour-over.
   - Fokus SOP: rinse/preheat filter tebal, flow stabil, hindari wall bypass,
     drawdown jangan dipaksa.
   - Risiko: filter tebal mudah membuat waktu terlalu lama.

8. Clever Dripper
   - Status MVP: siap untuk immersion-release.
   - Fokus SOP: steep tenang, release bersih, jangan swirl berat menjelang
     release.
   - Guard UI: panduan tetap menyebut Clever/valve, bukan Hario Switch.
   - Risiko: contact time terlalu panjang membuat cup muddy.

9. Bialetti Moka Pot
   - Status MVP: siap sebagai stovetop concentrated brew.
   - Fokus SOP: air base di bawah safety valve, basket jangan ditamp, panas
     moderat, hentikan sebelum sputter kasar.
   - Risiko: overheat membuat rasa rebus/pahit.

10. Toddy Cold Brew
    - Status MVP: siap untuk cold immersion.
    - Fokus SOP: saturasi bed kasar penuh, steep panjang, filter/decant bersih.
    - Risiko: dry pocket membuat hasil tipis.

11. Batch Brewer
    - Status MVP: siap untuk workflow cafe.
    - Fokus SOP: basket rata, siklus mesin selesai, aduk carafe sebelum tasting.
    - Risiko: bed miring membuat batch tidak konsisten.

12. Hario Siphon
    - Status MVP: siap untuk vacuum brew.
    - Fokus SOP: heat/vacuum stabil, agitasi singkat, heat-off tepat waktu,
      drawdown bersih.
    - Risiko: over-stir dan heat terlalu lama membuat finish kasar.

13. Origami Dripper (S/M)
    - Status MVP: siap sebagai cone/wave hybrid dengan kontrol filter style.
    - Fokus SOP: flow agile, pulse compact, jaga bed tidak terlalu tinggi.
    - Risiko: filter style mengubah flow, perlu kalibrasi rasa.

14. April Brewer
    - Status MVP: siap untuk flat-bottom low-agitation pulse.
    - Fokus SOP: pulse pendek, bed rata, finish cepat dan settled.
    - Risiko: grind terlalu halus mudah membuat finish macet.

15. Melitta
    - Status MVP: siap untuk trapezoid dripper.
    - Fokus SOP: bed level, pour measured, hindari over-agitation di sisi.
    - Risiko: trapezoid bed bisa ekstrak tidak rata bila stream terlalu ke tepi.

16. Kono Meimon
    - Status MVP: siap untuk cone sweet-core.
    - Fokus SOP: pour lebih center-focused, jaga core sweetness, jangan terlalu
      melebar ke wall.
    - Risiko: flow terlalu cepat membuat body tipis.

## Rekomendasi Berikutnya

- Tambahkan snapshot/golden scenario khusus core brewer untuk hot dan iced,
  terutama Hario Switch, AeroPress, French Press, Chemex, dan Kalita.
- Pisahkan trust UI antara "core picker" dan "source confidence" agar user
  pemula mudah memilih, tetapi barista tetap melihat status data.
- Tambahkan SOP micro-copy per metode di panduan seduh, bukan hanya ringkasan.
- Untuk Hario Switch, pertahankan profile sebagai hybrid immersion-release dan
  jangan memaksanya menjadi V60 full pour-over.

## Sumber Rujukan

- Hario USA Switch: https://www.hario-usa.com/products/switch-immersion-dripper
- Hario Europe Switch: https://www.hario-europe.com/products/v60-immersion-dripper-switch?variant=47850484400451
- AeroPress instructions: https://aeropress.com/pages/how-to-use
- AeroPress FAQ: https://aeropress.com/pages/faq
- SCA Golden Cup reference: https://coffeegeek.com/wp-content/uploads/2023/10/SCAGoldCupStandard.pdf
