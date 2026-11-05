export const WALLPAPERS = [
  { id: 'topographic', name: 'Quiet terrain', detail: 'Contours / 01', color: '#b8bea0' },
  { id: 'bauhaus', name: 'Sunday shapes', detail: 'Composition / 02', color: '#c39071' },
  { id: 'herbarium', name: 'Field study', detail: 'Botanical / 03', color: '#8d9f7b' },
  { id: 'atelier', name: 'The atelier', detail: 'Perspective / 04', color: '#b5baaf' },
  { id: 'dusk', name: 'Dusk window', detail: 'Evening / 05', color: '#dcae87' },
  { id: 'morning', name: 'Morning mist', detail: 'First light / 06', color: '#c1cdc3' },
  { id: 'dunes', name: 'Slow dunes', detail: 'Sand / 07', color: '#e4cb9e' },
  { id: 'seafoam', name: 'Sea foam', detail: 'Tide / 08', color: '#a9c4b4' }
];
let instance = 0;

export function renderWallpaper(id = 'topographic', theme = 'light', accent = '#b85f40', prefix) {
  const p = (prefix || `wp-${++instance}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const dark = theme === 'dark';
  const ink = dark ? '#a8b898' : '#5d6953';
  const bg = dark ? '#222c27' : '#e9e6d7';
  const safeAccent = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#b85f40';
  const defs = `<defs>
    <filter id="${p}-grain"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <filter id="${p}-shade" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="15" flood-color="#303e24" flood-opacity=".1"/></filter>
    <linearGradient id="${p}-sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark ? '#33443a' : '#cad0b1'}"/><stop offset="1" stop-color="${dark ? '#202d29' : '#b8c2a2'}"/></linearGradient>
    <pattern id="${p}-grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0v80" fill="none" stroke="${ink}" stroke-opacity=".09" stroke-width=".65"/></pattern>
    <pattern id="${p}-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v9" stroke="${ink}" stroke-width=".7" stroke-opacity=".12"/></pattern>
  </defs>`;
  let art = '';
  if (id === 'bauhaus') {
    art = `<rect width="1600" height="1000" fill="${bg}"/><rect width="1600" height="1000" fill="url(#${p}-grid)"/>
      <circle cx="1225" cy="280" r="218" fill="${dark ? '#8f674b' : '#cc9775'}"/><circle cx="1225" cy="280" r="161" fill="url(#${p}-hatch)"/>
      <path d="M770 1000V460a265 265 0 0 1 530 0v540Z" fill="${dark ? '#45583e' : '#a8b390'}"/>
      <path d="M865 1000V480a170 170 0 0 1 340 0v520Z" fill="${bg}"/>
      <path d="M1400 140v790h-235" fill="none" stroke="${ink}" stroke-width="1.4"/>
      <rect x="1190" y="720" width="360" height="180" fill="${dark ? '#a58d51' : '#d5ba77'}"/><path d="M1190 720h360l-360 180Z" fill="${dark ? '#25352e' : '#546651'}"/>
      <circle cx="280" cy="890" r="290" fill="${dark ? '#34483e' : '#d8dcca'}"/><path d="M0 810h570M0 835h570M0 860h570M0 885h570M0 910h570" stroke="${ink}" stroke-opacity=".14"/>
      <path d="M900 80h550M960 70v20M1200 70v20M1440 70v20" stroke="${ink}" stroke-opacity=".25"/>
      <text x="970" y="65" fill="${ink}" font-family="monospace" font-size="10" letter-spacing="3">FORM FOLLOWS FEELING</text>
      <g fill="none" stroke="${ink}" stroke-width="1" opacity=".2"><path d="M1120 130h210m-105-105v210M30 65h55M30 65v55M1570 935h-55m55 0v-55"/><circle cx="1225" cy="130" r="4"/><path d="M680 600v310m-8-310h16m-16 155h16m-16 155h16"/></g>
      <text x="690" y="755" fill="${ink}" opacity=".45" font-family="monospace" font-size="8" letter-spacing="1" transform="rotate(-90 690 755)">STRUCTURE / PLAY / BALANCE</text>
      <g transform="translate(1380 950)" fill="${ink}" opacity=".5"><circle r="3"/><circle cx="13" r="3"/><circle cx="26" r="3"/></g>`;
  } else if (id === 'herbarium') {
    const leaf = (x, y, rotate, scale, color) => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})"><path d="M0 0C-55-25-87-93-31-168C31-112 42-51 0 0Z" fill="${color}" stroke="${ink}" stroke-width="1.3"/><path d="M0 0-29-148M-8-42l-28-12m24-8 25-32m-30 10-25-20m20-5 18-23" fill="none" stroke="${ink}" stroke-width="1" stroke-opacity=".55"/></g>`;
    art = `<rect width="1600" height="1000" fill="${bg}"/><rect x="1070" y="110" width="360" height="760" fill="${dark ? '#29372d' : '#dedfcb'}"/>
      <rect width="1600" height="1000" fill="url(#${p}-grid)"/><path d="M1150 930C1180 760 1300 580 1230 250M1200 735l-170-184M1235 630l165-198M1250 466l-92-129" fill="none" stroke="${ink}" stroke-width="3"/>
      ${leaf(1192,755,-46,1.2,dark ? '#415944' : '#9fac85')}${leaf(1226,651,60,1.3,dark ? '#526348' : '#bbc39c')}${leaf(1243,560,-32,1.05,dark ? '#3a5340' : '#95a47d')}${leaf(1250,456,48,1.15,dark ? '#4b6549' : '#b0bd91')}${leaf(1236,349,-18,.85,dark ? '#4f6749' : '#9fac82')}
      <path d="M210 1000c90-150 45-225-30-320M232 881l100-105" stroke="${ink}" fill="none" stroke-width="2"/>${leaf(232,881,55,.9,dark ? '#374d3d' : '#b6bfa0')}${leaf(210,797,-20,.85,dark ? '#4a6044' : '#a4b38c')}
      <rect x="1060" y="835" width="232" height="95" fill="${dark ? '#364333' : '#f2eddc'}" stroke="${ink}" stroke-opacity=".2"/><text x="1080" y="863" font-family="Georgia,serif" fill="${ink}" font-size="19" font-style="italic">Laurus nobilis</text><text x="1080" y="887" font-family="monospace" fill="${ink}" font-size="9" letter-spacing="1.6">FIELD NOTES / SPECIMEN 014</text><path d="M1080 901h190" stroke="${ink}" stroke-opacity=".3"/><text x="1080" y="917" font-family="monospace" fill="${ink}" font-size="9">A STUDY IN QUIET GROWTH</text>`;
  } else if (id === 'atelier') {
    art = `<rect width="1600" height="1000" fill="${bg}"/><rect width="1600" height="1000" fill="url(#${p}-grid)"/>
      <g transform="translate(1150 540)" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round">
      <path d="m-370-55 310-175 470 270-310 177Z" fill="${dark ? '#465541' : '#c3cbb0'}"/><path d="m-370-55 0 25 470 270v-23M100 240 410 64V40" fill="none"/><path d="M-350-19v271l20 12V-7m405 231v270l25 14V240m289-163v260l-22 14V89" fill="${dark ? '#354330' : '#a5b193'}"/>
      <path d="m-180-78 125-72 167 97L-12 20Z" fill="${dark ? '#d2bfa2' : '#f5edda'}"/><path d="m-180-78 0 18L-12 36l124-71v-18M-12 20v16" fill="${dark ? '#aa997f' : '#dfcfac'}"/>
      <path d="m-135-70 128 73m-89-87 129 74" stroke-opacity=".3"/>
      <path d="m80 5 66-38 92 53-66 38Z" fill="${safeAccent}"/><path d="m91 7 51-29 75 43-51 29" fill="none" stroke="#f2d9b8"/>
      <ellipse cx="152" cy="-79" rx="41" ry="24" fill="${dark ? '#b5ba9d' : '#f5efda'}"/><path d="M111-79v57c0 32 82 32 82 0v-57M192-65c44-8 38 47 0 43" fill="${dark ? '#b5ba9d' : '#e6e0c9'}"/><ellipse cx="152" cy="-79" rx="33" ry="18" fill="#6e7051"/>
      <path d="m233 55 61-34 7 4-61 35Z" fill="${ink}"/><path d="m-105-217 60-35 110 64-61 35Z" fill="${dark ? '#758570' : '#dde1cc'}"/><path d="m-87-207 40-22 74 43-41 22Z" fill="url(#${p}-hatch)"/>
      <path d="m-385 287 457 264m70-52 288-166" stroke-dasharray="3 6" stroke-opacity=".3"/>
      <text x="170" y="370" stroke="none" fill="${ink}" font-family="monospace" font-size="10" letter-spacing="2">THE EVERYDAY ATELIER</text></g>`;
  } else if (id === 'dusk') {
    const wave = dark ? ['#5f4b42','#6d574c','#7c6356','#8b705f','#9a7d69','#a98a73','#b8967d'] : ['#d8a67e','#dfb28d','#e6bda0','#ecc8b3','#f2d3c4','#f6dece','#fae9da'];
    art = `<defs><linearGradient id="${p}-dusksky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark ? '#403230' : '#eed7b0'}"/><stop offset="1" stop-color="${dark ? '#55423c' : '#e7c39b'}"/></linearGradient></defs>
      <rect width="1600" height="1000" fill="url(#${p}-dusksky)"/>
      <g fill="${ink}" opacity=".45"><circle cx="250" cy="120" r="1.8"/><circle cx="430" cy="78" r="1.3"/><circle cx="990" cy="64" r="1.2"/><circle cx="1200" cy="110" r="1.6"/><circle cx="1390" cy="70" r="1.2"/></g>
      <g fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".5"><path d="M540 236q13-12 26 0M572 222q11-10 22 0M1176 196q13-12 26 0M1206 210q11-10 22 0"/></g>
      <circle cx="800" cy="590" r="150" fill="${dark ? '#e0bd88' : '#f9ecca'}" opacity=".95"/>
      <circle cx="800" cy="590" r="188" fill="none" stroke="${dark ? '#e0bd88' : '#f6e2b8'}" stroke-width="1.5" opacity=".35"/>
      <g filter="url(#${p}-shade)">
      <path d="M-60 648C240 620 420 690 720 650S1080 588 1340 646s150 44 320 20V1100H-60Z" fill="${wave[0]}"/>
      <path d="M-60 695C260 672 430 738 730 700S1090 640 1360 694s140 38 300 16V1100H-60Z" fill="${wave[1]}"/>
      <path d="M-60 744C250 726 440 784 740 750S1110 696 1380 742s130 34 280 14V1100H-60Z" fill="${wave[2]}"/>
      <path d="M-60 792C260 777 450 830 750 800S1120 750 1390 790s120 28 250 10V1100H-60Z" fill="${wave[3]}"/>
      <path d="M-60 838C270 827 460 868 760 844S1130 804 1400 836s110 24 260 8V1100H-60Z" fill="${wave[4]}"/>
      <path d="M-60 884C280 876 470 912 770 892S1140 856 1410 882s100 20 250 6V1100H-60Z" fill="${wave[5]}"/>
      <path d="M-60 930C290 925 480 952 780 938S1150 908 1420 928s90 14 240 4V1100H-60Z" fill="${wave[6]}"/>
      </g>
      <g stroke="${dark ? '#dcb87e' : '#f7e5bd'}" stroke-width="4" stroke-linecap="round" opacity=".6">
      <path d="M772 708h58M748 756h100M782 806h54M742 858h108M786 912h56M756 962h92"/>
      </g>
      <g opacity=".26" stroke="${ink}" fill="none"><path d="M1480 120v44m-22-22h44"/><circle cx="1480" cy="142" r="15"/></g>
      <text x="90" y="962" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".45">56.3 N / FIRST STAR AT 8:14</text>`;
  } else if (id === 'morning') {
    const hill = dark ? ['#8fa094','#849689','#78897d','#6d7d72'] : ['#dfe7dc','#d4ded2','#c8d3c5','#bccab9'];
    const pineColor = dark ? '#2e3831' : '#54655a';
    const pine = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${pineColor}"><path d="M0-62 15-32H-15Z"/><path d="M0-44 18-8H-18Z"/><rect x="-3" y="-8" width="6" height="18"/></g>`;
    art = `<defs><linearGradient id="${p}-mistsky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark ? '#4e5b52' : '#e6ecdf'}"/><stop offset="1" stop-color="${dark ? '#57645b' : '#d3ddd0'}"/></linearGradient></defs>
      <rect width="1600" height="1000" fill="url(#${p}-mistsky)"/>
      <circle cx="430" cy="168" r="74" fill="${dark ? '#d8cfa6' : '#fbf4d8'}" opacity=".8"/>
      <g filter="url(#${p}-shade)"><path d="M-60 452C360 420 720 470 1660 428V1100H-60Z" fill="${hill[0]}"/></g>
      <g filter="url(#${p}-shade)"><path d="M-60 540C420 505 780 556 1660 512V1100H-60Z" fill="${hill[1]}"/></g>
      ${pine(200, 540, 1)}${pine(276, 550, .8)}${pine(344, 538, .94)}${pine(1210, 548, .9)}${pine(1292, 558, .74)}${pine(1372, 546, .96)}
      <g fill="${dark ? '#dfe8dc' : '#ffffff'}" opacity=".28">
      <rect x="-30" y="576" width="1080" height="34" rx="17"/><rect x="460" y="648" width="1240" height="40" rx="20"/><rect x="-40" y="706" width="820" height="30" rx="15"/>
      </g>
      <g filter="url(#${p}-shade)"><path d="M-60 660C380 630 760 690 1660 646V1100H-60Z" fill="${hill[2]}"/></g>
      <g transform="translate(330 672)">
      <rect x="-46" y="-36" width="92" height="40" fill="${dark ? '#c9c2ae' : '#f7f2e2'}" stroke="${ink}" stroke-opacity=".5"/>
      <path d="M-56-36 0-68 56-36Z" fill="${dark ? '#8b6a4f' : '#c98d62'}"/>
      <rect x="16" y="-60" width="10" height="20" fill="${dark ? '#8b6a4f' : '#c98d62'}"/>
      <circle cx="0" cy="-15" r="6" fill="#e8b25c"/>
      </g>
      <g fill="${dark ? '#dfe8dc' : '#ffffff'}" opacity=".3"><rect x="140" y="696" width="940" height="30" rx="15"/></g>
      <g filter="url(#${p}-shade)"><path d="M-60 800C420 780 820 826 1660 792V1100H-60Z" fill="${hill[3]}"/></g>
      <text x="90" y="108" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".45">FIRST LIGHT / 6:02 AM</text>
      <text x="1420" y="962" text-anchor="end" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".45">THE FOG LIFTS SLOWLY</text>`;
  } else if (id === 'dunes') {
    const dune = dark ? ['#8a6f45','#9a7d4f','#ab8c5c','#bda06f','#cfb487'] : ['#d9b884','#e3c795','#ecd6a8','#f3e2bd','#f9edcf'];
    art = `<defs><linearGradient id="${p}-dunesky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark ? '#6b5638' : '#f3e3ba'}"/><stop offset="1" stop-color="${dark ? '#7d6543' : '#f8ecc9'}"/></linearGradient></defs>
      <rect width="1600" height="1000" fill="url(#${p}-dunesky)"/>
      <circle cx="1210" cy="196" r="82" fill="${dark ? '#e8d8a8' : '#fbf2d2'}" opacity=".9"/>
      <circle cx="1210" cy="196" r="118" fill="none" stroke="${dark ? '#e8d8a8' : '#f6ead0'}" stroke-width="1.5" opacity=".4"/>
      <g filter="url(#${p}-shade)"><path d="M-60 500C180 452 340 546 500 502C640 464 740 552 920 522S1300 470 1660 540V1100H-60Z" fill="${dune[0]}"/></g>
      <path d="M120 478C280 522 420 508 560 530" fill="none" stroke="${dark ? '#e9d6a6' : '#fffbe9'}" stroke-width="2" opacity=".8"/>
      <path d="M940 538c110-18 220-12 330 2" fill="none" stroke="${dark ? '#e9d6a6' : '#fffbe9'}" stroke-width="2" opacity=".6"/>
      <g transform="translate(1010 542)"><path d="M2 0C4-26 0-44 10-62" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><ellipse cx="12" cy="-70" rx="40" ry="13" fill="${ink}" opacity=".85"/><ellipse cx="30" cy="-84" rx="24" ry="9" fill="${ink}" opacity=".7"/></g>
      <g filter="url(#${p}-shade)"><path d="M-60 636C200 592 380 682 560 640C720 604 820 690 1000 662S1380 610 1660 668V1100H-60Z" fill="${dune[1]}"/></g>
      <path d="M180 622c140 34 280 22 420 40" fill="none" stroke="${dark ? '#e9d6a6' : '#fffbe9'}" stroke-width="2" opacity=".7"/>
      <g stroke="${ink}" stroke-width="1.2" opacity=".26" fill="none">
      <path d="M240 706c70-10 140-8 210 2M420 748c70-10 140-8 210 2M980 764c70-10 140-8 210 2M300 826c70-10 140-8 210 2M1050 906c70-10 140-8 210 2"/>
      </g>
      <g filter="url(#${p}-shade)"><path d="M-60 790C260 756 460 830 660 796C830 768 960 838 1160 812S1460 776 1660 812V1100H-60Z" fill="${dune[2]}"/></g>
      <g fill="${ink}" opacity=".3"><circle cx="700" cy="864" r="2.4"/><circle cx="684" cy="874" r="2.4"/><circle cx="668" cy="884" r="2.4"/><circle cx="652" cy="894" r="2.4"/><circle cx="636" cy="906" r="2.4"/><circle cx="620" cy="920" r="2.4"/></g>
      <g filter="url(#${p}-shade)"><path d="M-60 900C320 880 620 936 1660 902V1100H-60Z" fill="${dune[3]}"/></g>
      <path d="M-60 952C360 940 760 972 1660 948V1100H-60Z" fill="${dune[4]}"/>
      <text x="90" y="962" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".45">23.4 N / THE LONG AFTERNOON</text>`;
  } else if (id === 'seafoam') {
    const sea = dark ? ['#416055','#4b6b5f','#55766a','#5f8175','#6a8c80','#7a9a8d','#8aa89a'] : ['#7fa893','#8cb49e','#99bfa9','#a6cab4','#b3d5bf','#c0dfc9','#cde9d3'];
    const foamLine = y => `M-60 ${y} ` + Array.from({ length: 22 }, () => 'q40 -15 80 0').join(' ');
    let rows = '';
    [[586, 1], [674, 2], [760, 3], [844, 4], [924, 5], [994, 6]].forEach(([y, i]) => {
      rows += `<g filter="url(#${p}-shade)"><path d="M-60 ${y}H1660V1100H-60Z" fill="${sea[i]}"/></g><path d="${foamLine(y)}" fill="none" stroke="${dark ? '#cfe0d2' : '#ffffff'}" stroke-width="2.5" opacity=".75"/>`;
    });
    art = `<defs><linearGradient id="${p}-seasky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark ? '#3d5348' : '#cfe0cf'}"/><stop offset="1" stop-color="${dark ? '#48604f' : '#ddecdc'}"/></linearGradient></defs>
      <rect width="1600" height="1000" fill="url(#${p}-seasky)"/>
      <g filter="url(#${p}-shade)"><path d="M-60 470C300 452 700 484 1660 462V1100H-60Z" fill="${sea[0]}"/></g>
      <g transform="translate(1080 452)">
      <path d="M-34 0q34 18 68 0l-8-12q-26 10-52 0Z" fill="${ink}"/>
      <path d="M2-10V-58" stroke="${ink}" stroke-width="2.5"/>
      <path d="M0-56 -26 -12H0Z" fill="${dark ? '#dfe8dc' : '#fdf9ea'}" stroke="${ink}" stroke-width="1.5"/>
      <path d="M6-50 26-12H6Z" fill="${dark ? '#dfe8dc' : '#fdf9ea'}" stroke="${ink}" stroke-width="1.5"/>
      </g>
      <g fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M920 330q12-11 24 0M948 318q10-9 20 0M1260 300q12-11 24 0"/></g>
      ${rows}
      <text x="90" y="962" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".5">TIDE TABLE / HIGH, SOFT</text>`;
  } else {
    const colors = dark ? ['#29382f','#3b4c3c','#53614a','#657058','#827b59','#a39168','#b8a584'] : ['#b6c2a0','#c4cdae','#d1d5b7','#e0dec0','#eae4cd','#f0e9d8','#f8f1e4'];
    art = `<rect width="1600" height="1000" fill="url(#${p}-sky)"/>
      <circle cx="1260" cy="155" r="85" fill="${dark ? '#b29364' : '#eee5bb'}" opacity=".6"/>
      <g filter="url(#${p}-shade)">
      <path d="M-60 665C240 605 280 800 543 640S752 80 1130 251s303 159 530-23V1100H-60Z" fill="${colors[0]}"/>
      <path d="M-80 656c260-70 350 190 593 52S782 263 1081 352s374 130 579 12V1100H-80Z" fill="${colors[1]}"/>
      <path d="M-70 623c260-9 299 234 562 151S773 423 1077 462s362 112 583 14V1100H-70Z" fill="${colors[2]}"/>
      <path d="M-70 586c255 20 277 294 553 252S790 581 1086 550s380 103 574 30V1100H-70Z" fill="${colors[3]}"/>
      <path d="M-60 607c239 0 297 314 566 300s328-212 627-282 365 64 527 50V1100H-60Z" fill="${colors[4]}"/>
      <path d="M-60 688c251-20 310 280 565 293s348-208 654-249 334 58 501 83V1100H-60Z" fill="${colors[5]}"/>
      <path d="M-60 817c207-64 398 255 654 211s363-156 579-214 323 35 487 95V1100H-60Z" fill="${colors[6]}"/>
      </g>
      <g fill="none" stroke="${dark ? '#ced2a6' : '#eef0dc'}" stroke-width="1" opacity=".32">
      <path d="M690 156c231-130 362 16 491 55s326 73 462-34M689 176c231-130 362 16 491 55s326 73 462-34M690 197c231-130 362 16 491 55s326 73 462-34"/>
      <path d="M648 334c122-263 320-252 566-139s325 93 446-5M652 360c120-260 320-249 566-136s325 93 446-5"/>
      <path d="M922 742c186-142 333-63 481-63s158-6 232-29M939 766c186-142 333-63 481-63s158-6 232-29"/>
      </g>
      <g opacity=".25" stroke="${ink}" fill="none"><path d="M1465 74v61m-30-30h60"/><circle cx="1465" cy="105" r="20"/><path d="m1465 80-4 16h8Z" fill="${ink}"/><path d="M90 970h160m-160-5v10m80-10v10m80-10v10"/></g>
      <text x="1465" y="63" text-anchor="middle" font-family="monospace" font-size="10" fill="${ink}" opacity=".5">N</text>
      <text x="90" y="992" fill="${ink}" font-family="monospace" font-size="9" letter-spacing="2" opacity=".4">0 ——— A SLOWER PERSPECTIVE</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${WALLPAPERS.find(w => w.id === id)?.name || 'Quiet terrain'} wallpaper">${defs}${art}<rect width="1600" height="1000" filter="url(#${p}-grain)" opacity="${dark ? '.035' : '.045'}" style="mix-blend-mode:multiply"/></svg>`;
}
