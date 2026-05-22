import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

const inventoryBase = [
  ["V003", "高麗菜泥", "蔬菜", 50, 6, 90, "可用", "冷凍", "易脹氣者少量"],
  ["S002", "米糊", "澱粉", 15, 12, 60, "可用", "冷凍", "溫和澱粉"],
  ["F001", "蘋果泥", "水果", 20, 6, 20, "可用", "冷凍", "每日水果上限需控管"],
  ["V008", "小白菜泥", "蔬菜", 20, 2, 60, "可用", "冷凍", "鈣質較高"],
  ["S004", "南瓜泥", "澱粉", 10, 11, 60, "可用", "冷凍", "溫和好消化"],
  ["P001", "鱈魚泥", "蛋白質", 15, 5, 15, "可用", "冷凍", "試敏已完成"],
  ["P002", "雞肉泥", "蛋白質", 15, 9, 15, "可用", "冷凍", "蛋白質來源"],
  ["V019", "冬瓜泥", "蔬菜", 30, 6, 60, "可用", "冷凍", "尚未試敏"],
  ["S003", "地瓜泥", "澱粉", 10, 11, 60, "可用", "冷凍", "澱粉需控制"],
  ["F002", "香蕉泥", "水果", 20, 4, 20, "可用", "冷凍", "易影響便便"],
];

const traitBase = {
  高麗菜泥: ["蔬菜", "低", "中", "中", "是", "是", "可少量", "是", "已完成", "", "易脹氣者少量"],
  米糊: ["澱粉", "低", "低", "低", "否", "可少量", "是", "是", "已完成", "", "溫和澱粉"],
  蘋果泥: ["水果", "中", "低", "中", "否", "是", "是", "是", "已完成", "", "每日水果上限20g"],
  小白菜泥: ["蔬菜", "中", "中", "中", "否", "是", "可少量", "是", "已完成", "", "鈣質較高"],
  南瓜泥: ["澱粉", "高", "低", "中", "否", "可少量", "是", "是", "已完成", "", "溫和好消化"],
  鱈魚泥: ["蛋白質", "低", "低", "低", "否", "可少量", "可少量", "可少量", "已完成", "", "高蛋白"],
  雞肉泥: ["蛋白質", "低", "低", "低", "否", "可少量", "可少量", "可少量", "已完成", "", "高蛋白"],
  冬瓜泥: ["蔬菜", "高", "低", "低", "否", "是", "是", "是", "未試敏", "", "清爽、水分高"],
  地瓜泥: ["澱粉", "中", "中", "中", "否", "可少量", "可少量", "可少量", "已完成", "", "澱粉需控制"],
  香蕉泥: ["水果", "中", "低", "中", "否", "可少量", "是", "可少量", "已完成", "", "易影響便便"],
};

const rules = [
  ["R001", "早餐總量", "早餐", "全部", 185, "等於", "每餐總量"],
  ["R002", "晚餐總量", "晚餐", "全部", 185, "等於", "每餐總量"],
  ["R003", "早餐澱粉上限", "早餐", "澱粉", 60, "小於等於", "依營養師建議"],
  ["R005", "每日水果上限", "全日", "水果", 20, "小於等於", "一天合計"],
  ["R007", "每日蛋白質上限", "全日", "蛋白質", 30, "小於等於", "一天合計"],
];

const stoolConditions = ["正常", "山羊便", "硬便/條狀", "軟便", "水瀉"];
const appetites = ["正常", "普通", "偏低", "很好"];
const coughStates = ["無", "輕微", "咳嗽/痰"];

function sampleMany(items, count) {
  const pool = [...items];
  const output = [];
  while (pool.length && output.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    output.push(pool.splice(index, 1)[0]);
  }
  return output;
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const selectedInventory = sampleMany(inventoryBase, 5);

  await prisma.menuPlanItem.deleteMany();
  await prisma.menuPlan.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.dailyCondition.deleteMany();
  await prisma.sensitivityRecord.deleteMany();
  await prisma.feedingRule.deleteMany();
  await prisma.ingredientTrait.deleteMany();
  await prisma.inventoryItem.deleteMany();

  await prisma.inventoryItem.createMany({
    data: selectedInventory.map((item, index) => ({
      code: item[0],
      name: item[1],
      category: item[2],
      specGrams: item[3],
      stockUnits: item[4],
      suggestionLimitGrams: item[5],
      status: item[6],
      updatedAt: daysAgo(index),
      storageMethod: item[7],
      expiresAt: daysAgo(-30 + index),
      notes: item[8],
    })),
  });

  await prisma.ingredientTrait.createMany({
    data: selectedInventory.map((item) => {
      const trait = traitBase[item[1]];
      return {
        ingredientName: item[1],
        primaryType: trait[0],
        solubleFiber: trait[1],
        insolubleFiber: trait[2],
        fiberLevel: trait[3],
        easyGas: trait[4],
        forConstipation: trait[5],
        forDiarrhea: trait[6],
        forPhlegm: trait[7],
        sensitivity: trait[8],
        adverseNotes: trait[9],
        nutritionNotes: trait[10],
      };
    }),
  });

  await prisma.feedingRule.createMany({
    data: rules.map((rule) => ({
      code: rule[0],
      item: rule[1],
      mealType: rule[2],
      category: rule[3],
      limitGrams: rule[4],
      checkType: rule[5],
      notes: rule[6],
    })),
  });

  await prisma.sensitivityRecord.createMany({
    data: Array.from({ length: 5 }, (_, index) => {
      const ingredient = pickOne(selectedInventory);
      return {
        recordedOn: daysAgo(index),
        ingredientName: ingredient[1],
        grams: Math.max(5, Math.min(ingredient[3], 20)),
        daySequence: index + 1,
        result: index % 2 === 0 ? "正常" : "待觀察",
        symptomNotes: index % 2 === 0 ? "" : "觀察便便狀況",
        isCompleted: index % 2 === 0,
      };
    }),
  });

  await prisma.dailyCondition.createMany({
    data: Array.from({ length: 5 }, (_, index) => ({
      recordedOn: daysAgo(index),
      stoolCondition: pickOne(stoolConditions),
      fever: "否",
      coughPhlegm: pickOne(coughStates),
      appetite: pickOne(appetites),
      waterMilkStatus: "正常",
      notes: "seed 範例資料",
      pairingDirection: index % 2 === 0 ? "優先溫和食材" : "控制水果量",
    })),
  });

  await prisma.inventoryMovement.createMany({
    data: Array.from({ length: 5 }, (_, index) => {
      const ingredient = pickOne(selectedInventory);
      return {
        movedAt: daysAgo(index),
        ingredientName: ingredient[1],
        movementType: index % 2 === 0 ? "補貨" : "使用",
        grams: ingredient[3],
        sourceOrUse: index % 2 === 0 ? "每週備料" : "午餐製作",
        notes: "seed 範例資料",
      };
    }),
  });

  for (let index = 0; index < 5; index += 1) {
    const picked = sampleMany(selectedInventory, 3);
    const totalGrams = picked.reduce((sum, item) => sum + item[3], 0);

    await prisma.menuPlan.create({
      data: {
        planDate: daysAgo(index),
        mealType: index % 2 === 0 ? "早餐" : "晚餐",
        status: index % 3 === 0 ? "草稿" : "已餵食",
        totalGrams,
        conditionText: pickOne(stoolConditions),
        notes: "由 seed script 依原專案格式隨機建立",
        items: {
          create: picked.map((item, itemIndex) => ({
            ingredientName: item[1],
            itemType: item[2],
            grams: item[3],
            sortOrder: itemIndex + 1,
          })),
        },
      },
    });
  }

  console.log("Seed completed with 5 random records per module.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });