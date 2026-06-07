export interface BarbarianReward {
  level: number;
  gold: number;
  wood: number;
  wine: number;
  marble: number;
  crystal: number;
  sulfur: number;
  totalResources: number;
  boats: number;
}

export const BARBARIAN_REWARDS: BarbarianReward[] = [
  { level: 1, gold: 250, wood: 220, wine: 64, marble: 76, crystal: 90, sulfur: 50, totalResources: 500, boats: 1 },
  { level: 2, gold: 450, wood: 260, wine: 72, marble: 85, crystal: 101, sulfur: 57, totalResources: 575, boats: 2 },
  { level: 3, gold: 800, wood: 340, wine: 89, marble: 104, crystal: 123, sulfur: 69, totalResources: 725, boats: 2 },
  { level: 4, gold: 1600, wood: 460, wine: 113, marble: 132, crystal: 157, sulfur: 88, totalResources: 950, boats: 2 },
  { level: 5, gold: 2450, wood: 620, wine: 145, marble: 170, crystal: 202, sulfur: 113, totalResources: 1250, boats: 3 },
  { level: 6, gold: 3350, wood: 820, wine: 185, marble: 217, crystal: 258, sulfur: 145, totalResources: 1625, boats: 4 },
  { level: 7, gold: 4300, wood: 980, wine: 233, marble: 274, crystal: 325, sulfur: 183, totalResources: 1995, boats: 4 },
  { level: 8, gold: 5300, wood: 1260, wine: 285, marble: 335, crystal: 397, sulfur: 223, totalResources: 2500, boats: 5 },
  { level: 9, gold: 6350, wood: 1580, wine: 350, marble: 410, crystal: 486, sulfur: 274, totalResources: 3100, boats: 7 },
  { level: 10, gold: 7500, wood: 2000, wine: 338, marble: 508, crystal: 432, sulfur: 602, totalResources: 3880, boats: 8 },
  { level: 11, gold: 8750, wood: 2520, wine: 418, marble: 626, crystal: 534, sulfur: 742, totalResources: 4840, boats: 10 },
  { level: 12, gold: 10100, wood: 3140, wine: 511, marble: 767, crystal: 653, sulfur: 909, totalResources: 5980, boats: 12 },
  { level: 13, gold: 11550, wood: 3860, wine: 619, marble: 929, crystal: 791, sulfur: 1101, totalResources: 7300, boats: 15 },
  { level: 14, gold: 13100, wood: 4680, wine: 742, marble: 1112, crystal: 948, sulfur: 1318, totalResources: 8800, boats: 18 },
  { level: 15, gold: 14750, wood: 5600, wine: 878, marble: 1318, crystal: 1122, sulfur: 1562, totalResources: 10480, boats: 21 },
  { level: 16, gold: 16500, wood: 6620, wine: 1030, marble: 1544, crystal: 1316, sulfur: 1830, totalResources: 12340, boats: 25 },
  { level: 17, gold: 18325, wood: 7740, wine: 1195, marble: 1793, crystal: 1527, sulfur: 2125, totalResources: 14380, boats: 29 },
  { level: 18, gold: 20300, wood: 8960, wine: 1375, marble: 2063, crystal: 1757, sulfur: 2445, totalResources: 16600, boats: 34 },
  { level: 19, gold: 22350, wood: 10280, wine: 1570, marble: 2354, crystal: 2006, sulfur: 2790, totalResources: 19000, boats: 38 },
  { level: 20, gold: 24600, wood: 11750, wine: 2714, marble: 1809, crystal: 2312, sulfur: 3216, totalResources: 21801, boats: 44 },
  { level: 21, gold: 27050, wood: 13370, wine: 3140, marble: 2093, crystal: 2675, sulfur: 3722, totalResources: 25000, boats: 50 },
  { level: 22, gold: 29700, wood: 15140, wine: 3634, marble: 2423, crystal: 3096, sulfur: 4307, totalResources: 28600, boats: 58 },
  { level: 23, gold: 32550, wood: 17060, wine: 4196, marble: 2975, crystal: 3574, sulfur: 4973, totalResources: 32778, boats: 66 },
  { level: 24, gold: 35600, wood: 19130, wine: 4825, marble: 3217, crystal: 4110, sulfur: 5718, totalResources: 37000, boats: 74 },
  { level: 25, gold: 38850, wood: 21350, wine: 5522, marble: 3681, crystal: 4704, sulfur: 6544, totalResources: 41801, boats: 84 },
  { level: 26, gold: 42300, wood: 23720, wine: 6286, marble: 4190, crystal: 5354, sulfur: 7450, totalResources: 47000, boats: 94 },
  { level: 27, gold: 45950, wood: 26240, wine: 7117, marble: 4745, crystal: 6063, sulfur: 8435, totalResources: 52600, boats: 106 },
  { level: 28, gold: 49800, wood: 28910, wine: 8016, marble: 5344, crystal: 6829, sulfur: 9501, totalResources: 58600, boats: 118 },
  { level: 29, gold: 53850, wood: 31730, wine: 8983, marble: 5989, crystal: 7652, sulfur: 10646, totalResources: 65000, boats: 130 },
  { level: 30, gold: 58200, wood: 34800, wine: 12000, marble: 10125, crystal: 6750, sulfur: 8625, totalResources: 72300, boats: 145 },
  { level: 31, gold: 62850, wood: 38120, wine: 13265, marble: 11443, crystal: 7628, sulfur: 9747, totalResources: 80203, boats: 161 },
  { level: 32, gold: 67800, wood: 41690, wine: 15331, marble: 12936, crystal: 8624, sulfur: 11019, totalResources: 89600, boats: 180 },
  { level: 33, gold: 73050, wood: 45510, wine: 17309, marble: 14604, crystal: 9736, sulfur: 12441, totalResources: 99600, boats: 200 },
  { level: 34, gold: 78600, wood: 49580, wine: 19494, marble: 16448, crystal: 10966, sulfur: 14012, totalResources: 110500, boats: 221 },
  { level: 35, gold: 84450, wood: 53900, wine: 21888, marble: 18468, crystal: 12312, sulfur: 15732, totalResources: 122300, boats: 245 },
  { level: 36, gold: 90600, wood: 58470, wine: 24490, marble: 20663, crystal: 13775, sulfur: 17602, totalResources: 135000, boats: 270 },
  { level: 37, gold: 97050, wood: 63290, wine: 27299, marble: 23034, crystal: 15356, sulfur: 19621, totalResources: 148600, boats: 298 },
  { level: 38, gold: 103800, wood: 68360, wine: 30317, marble: 25580, crystal: 17053, sulfur: 21790, totalResources: 163100, boats: 327 },
  { level: 39, gold: 110850, wood: 73680, wine: 33542, marble: 28301, crystal: 18868, sulfur: 24109, totalResources: 178500, boats: 357 },
  { level: 40, gold: 118300, wood: 79350, wine: 37248, marble: 26772, crystal: 20952, sulfur: 31428, totalResources: 195750, boats: 392 },
  { level: 41, gold: 126150, wood: 85370, wine: 41434, marble: 29780, crystal: 23306, sulfur: 34960, totalResources: 214850, boats: 430 },
  { level: 42, gold: 134400, wood: 91740, wine: 46099, marble: 33134, crystal: 25931, sulfur: 38896, totalResources: 235800, boats: 472 },
  { level: 43, gold: 143050, wood: 98460, wine: 51245, marble: 36832, crystal: 28825, sulfur: 43238, totalResources: 258600, boats: 518 },
  { level: 44, gold: 152100, wood: 105530, wine: 56870, marble: 40876, crystal: 31990, sulfur: 47984, totalResources: 283250, boats: 567 },
  { level: 45, gold: 161550, wood: 112950, wine: 62976, marble: 45264, crystal: 35424, sulfur: 53136, totalResources: 309750, boats: 620 },
  { level: 46, gold: 171400, wood: 120720, wine: 69562, marble: 49997, crystal: 39128, sulfur: 58693, totalResources: 338100, boats: 677 },
  { level: 47, gold: 181650, wood: 128840, wine: 76627, marble: 55076, crystal: 43103, sulfur: 64654, totalResources: 368300, boats: 737 },
  { level: 48, gold: 192300, wood: 137310, wine: 84173, marble: 60499, crystal: 47347, sulfur: 71021, totalResources: 400350, boats: 801 },
  { level: 49, gold: 203350, wood: 146130, wine: 92198, marble: 66268, crystal: 51862, sulfur: 77792, totalResources: 434250, boats: 869 },
  { level: 50, gold: 215000, wood: 156950, wine: 108224, marble: 77786, crystal: 60876, sulfur: 91314, totalResources: 495150, boats: 991 },
];
