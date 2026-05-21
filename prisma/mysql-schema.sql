CREATE TABLE InventoryItem (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(40) NOT NULL,
  specGrams INT NOT NULL,
  stockUnits INT NOT NULL,
  suggestionLimitGrams INT NULL,
  status VARCHAR(40) NOT NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  storageMethod VARCHAR(40) NULL,
  expiresAt DATETIME(3) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY InventoryItem_code_key (code)
);

CREATE TABLE IngredientTrait (
  id INT NOT NULL AUTO_INCREMENT,
  ingredientName VARCHAR(120) NOT NULL,
  primaryType VARCHAR(40) NOT NULL,
  solubleFiber VARCHAR(20) NULL,
  insolubleFiber VARCHAR(20) NULL,
  fiberLevel VARCHAR(20) NULL,
  easyGas VARCHAR(20) NULL,
  forConstipation VARCHAR(20) NULL,
  forDiarrhea VARCHAR(20) NULL,
  forPhlegm VARCHAR(20) NULL,
  sensitivity VARCHAR(40) NULL,
  adverseNotes VARCHAR(255) NULL,
  nutritionNotes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY IngredientTrait_ingredientName_key (ingredientName)
);

CREATE TABLE FeedingRule (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  item VARCHAR(80) NOT NULL,
  mealType VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  limitGrams INT NOT NULL,
  checkType VARCHAR(40) NOT NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY FeedingRule_code_key (code)
);

CREATE TABLE SensitivityRecord (
  id INT NOT NULL AUTO_INCREMENT,
  recordedOn DATETIME(3) NOT NULL,
  ingredientName VARCHAR(120) NOT NULL,
  grams INT NOT NULL,
  daySequence INT NOT NULL,
  result VARCHAR(40) NULL,
  symptomNotes VARCHAR(255) NULL,
  isCompleted BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id)
);

CREATE TABLE DailyCondition (
  id INT NOT NULL AUTO_INCREMENT,
  recordedOn DATETIME(3) NOT NULL,
  stoolCondition VARCHAR(40) NULL,
  fever VARCHAR(40) NULL,
  coughPhlegm VARCHAR(40) NULL,
  appetite VARCHAR(40) NULL,
  waterMilkStatus VARCHAR(80) NULL,
  notes VARCHAR(255) NULL,
  pairingDirection VARCHAR(255) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE MenuPlan (
  id INT NOT NULL AUTO_INCREMENT,
  planDate DATETIME(3) NOT NULL,
  mealType VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  totalGrams INT NOT NULL,
  conditionText VARCHAR(255) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE MenuPlanItem (
  id INT NOT NULL AUTO_INCREMENT,
  menuPlanId INT NOT NULL,
  ingredientName VARCHAR(120) NOT NULL,
  itemType VARCHAR(40) NOT NULL,
  grams INT NOT NULL,
  sortOrder INT NOT NULL,
  PRIMARY KEY (id),
  KEY MenuPlanItem_menuPlanId_sortOrder_idx (menuPlanId, sortOrder),
  CONSTRAINT MenuPlanItem_menuPlanId_fkey FOREIGN KEY (menuPlanId) REFERENCES MenuPlan(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE InventoryMovement (
  id INT NOT NULL AUTO_INCREMENT,
  movedAt DATETIME(3) NOT NULL,
  ingredientName VARCHAR(120) NOT NULL,
  movementType VARCHAR(40) NOT NULL,
  grams INT NOT NULL,
  sourceOrUse VARCHAR(120) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id)
);