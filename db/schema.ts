import { sql } from "drizzle-orm";

import {
  bigint,
  customType,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
} from "drizzle-orm/mysql-core";


/**
 * 精确字符串
 *
 * MySQL 默认 varchar 比较会忽略尾随空格。
 * 使用 utf8mb4_bin + 二进制生成列保证严格唯一。
 */
const exactText = customType<{
  data: string;
  driverData: string;
  config: {
    length: number;
  };
}>({
  dataType: (config) =>
    `varchar(${config!.length}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
});


/**
 * 毫秒时间戳
 *
 * MySQL 5.7 不支持：
 * DEFAULT CURRENT_TIMESTAMP(3)
 *
 * 使用：
 * 0 = 未初始化
 * INSERT / UPDATE trigger 自动填充
 */
const milliseconds = customType<{
  data: Date;
  driverData: string | number;
}>({
  dataType: () => "bigint",

  toDriver(value) {
    return value.getTime();
  },

  fromDriver(value) {
    return new Date(Number(value));
  },
});


const timestamps = () => ({
  createdAt: milliseconds("created_at")
    .notNull()
    .default(sql`0`),

  updatedAt: milliseconds("updated_at")
    .notNull()
    .default(sql`0`),
});


/**
 * 二进制字段
 *
 * 用于 nameKey 精确唯一比较
 */
const binaryName = customType<{
  data: Buffer;
  driverData: Buffer;
  config: {
    length: number;
  };
}>({
  dataType: (config) =>
    `varbinary(${config!.length})`,
});



/**
 * 员工信息
 */
export const persons = mysqlTable(
  "persons",
  {

    id: int("id")
      .autoincrement()
      .primaryKey(),


    /**
     * 姓名
     */
    name: exactText("name", {
      length: 100,
    })
      .notNull(),


    /**
     * 精确姓名 KEY
     *
     * 解决：
     * 张三
     * 张三 
     *
     * 唯一冲突问题
     */
    nameKey: binaryName(
      "name_key",
      {
        length: 400,
      }
    )
      .generatedAlwaysAs(
        sql`CAST(name AS BINARY)`,
        {
          mode: "stored",
        }
      ),


    gender: exactText(
      "gender",
      {
        length:100,
      }
    ),


    ethnicity: exactText(
      "ethnicity",
      {
        length:100,
      }
    ),


    nativePlace: exactText(
      "native_place",
      {
        length:100,
      }
    ),


    /**
     * 敏感信息
     *
     * JSON整体加密保存
     *
     * 示例：
     * {
     *   idCard:"",
     *   bankCard:"",
     *   phone:""
     * }
     */
    sensitiveInfo: text(
      "sensitive_info"
    ),


    bankName: exactText(
      "bank_name",
      {
        length:100,
      }
    ),


    ...timestamps(),
  },

  (table) => [

    uniqueIndex(
      "persons_name_unique"
    )
      .on(table.nameKey),

  ]
);



/**
 * 工资批次
 */
export const payrollSheets = mysqlTable(
  "payroll_sheets",
  {

    id: int("id")
      .autoincrement()
      .primaryKey(),


    name: exactText(
      "name",
      {
        length:80,
      }
    )
      .notNull(),


    nameKey: binaryName(
      "name_key",
      {
        length:320,
      }
    )
      .generatedAlwaysAs(
        sql`CAST(name AS BINARY)`,
        {
          mode:"stored",
        }
      ),


    ...timestamps(),

  },

  (table)=>[

    uniqueIndex(
      "payroll_sheets_name_unique"
    )
      .on(table.nameKey),

  ]
);




/**
 * 工资记录
 */
export const payrollRecords = mysqlTable(
  "payroll_records",
  {

    id: int("id")
      .autoincrement()
      .primaryKey(),


    payrollSheetId:
      int("payroll_sheet_id")
        .notNull()
        .references(
          ()=>payrollSheets.id,
          {
            onDelete:"restrict",
            onUpdate:"cascade",
          }
        ),



    personId:
      int("person_id")
        .notNull()
        .references(
          ()=>persons.id,
          {
            onDelete:"restrict",
            onUpdate:"cascade",
          }
        ),



    /**
     * 金额单位：
     * 分
     *
     * 示例：
     * 10000元 = 1000000
     */
    actualAmount:
      bigint(
        "actual_amount",
        {
          mode:"number",
        }
      )
      .notNull(),



    ...timestamps(),

  },


  (table)=>[


    index(
      "payroll_records_sheet_id_idx"
    )
      .on(
        table.payrollSheetId
      ),



    index(
      "payroll_records_person_id_idx"
    )
      .on(
        table.personId
      ),



    /**
     * 员工工资历史查询
     *
     * WHERE person_id=?
     * ORDER BY created_at DESC
     */
    index(
      "payroll_records_person_time_idx"
    )
      .on(
        table.personId,
        table.createdAt
      ),



    /**
     * 同一工资单，一个员工只能出现一次
     */
    uniqueIndex(
      "payroll_records_sheet_person_unique"
    )
      .on(
        table.payrollSheetId,
        table.personId
      ),

  ]
);