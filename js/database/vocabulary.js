// vocabulary.js（数据库模块）- 词汇录入
//
// 本模块仅负责 VOCABULARY 数据的录入，置于 ./database 目录。
// 词条类 Vocabulary / Phoneme / Ligature 定义在 semantics.js（共同基类 Semantics）。
// 词条第二项为 **MdC 渲染串**（如 "S34-[N35:AA1]"）——渲染引擎只接受纯 MdC，

var VOCABULARY = [
    new Vocabulary("rmT", "A1-A1-A1"),
    new Vocabulary("swr", "A2"),
    new Vocabulary("wab", "A6"),
    new Vocabulary("kAt", "A9-X1-Y1:Z2"),
    new Vocabulary("kAt", "A9-Z3"),
    new Vocabulary("xr", "A15"),
    new Vocabulary("Hr", "D2:Z1"),
    new Vocabulary("Hr", "D2*Z1:D21"),
    new Vocabulary("iri", "D4", { en: "create, beget, make, construct, do, act, take action, achieve, prepare, treat", chs: "创造，产生，制造，建造，做，行动，采取行动，实现，准备，处理" }),
    new Vocabulary("ir", "D4-A1", { en: "doer (of good)", chs: "行善者" }),
    new Vocabulary("irwy", "D4:D4", { en: "eyes", chs: "眼睛" }),
    new Vocabulary("irr", "D4:D21-A1", { en: "(evil) doer", chs: "作恶者" }),
    new Vocabulary("irt", "D4:X1*Z1", { en: "eye", chs: "眼睛" }),
    new Vocabulary("msdmt", "D7", { en: "black eye paint", chs: "黑色眼影粉" }),
    new Vocabulary("rmw", "D9", { en: "weep", chs: "哭泣" }),
    new Vocabulary("wDAt", "D10", { en: "the uninjured eye of Horus", chs: "荷鲁斯之眼" }),
    new Vocabulary("fnD", "D19:Z1", { en: "nose", chs: "鼻子" }),
    new Vocabulary("fnDy", "D19:Z1-M17a-C3", { en: "long nosed, Beaky", chs: "鼻子长的，长鸟嘴的" }),
    new Vocabulary("rdw", "D21:D46-G43-D56-D56-D56-O40", { en: "stairway", chs: "楼梯，阶梯" }),
    new Vocabulary("rmwt", "D21-G17-M17a-X1-D9A", { en: "tears", chs: "眼泪" }),
    new Vocabulary("rn", "D21:N35", { en: "name", chs: "名字" }),
    new Vocabulary("rn", "D21:N35-A2", { en: "name", chs: "名字" }),
    new Vocabulary("rnn", "D21:N35-M22-M22", { en: "caress", chs: "轻抚，爱抚" }),
    new Vocabulary("rnn", "D21:N35:N35-A2", { en: "bring up, nurse", chs: "抚养，照顾" }),
    new Vocabulary("rnn", "D21:N35:N35-A18", { en: "bring up, nurse", chs: "抚养，照顾" }),
    new Vocabulary("rnn", "D21:N35:N35-B6", { en: "bring up, nurse", chs: "抚养，照顾" }),
    new Vocabulary("rn", "D21:N35-V10", { en: "name (of king)", chs: "王的名字" }),
    new Vocabulary("rnnwtt", "D21:N35-X1:W24:X1-I13", { en: "(divinity) Renenutet (the Harvest goddess)", chs: "列涅努忒" }),
    new Vocabulary("rSrS", "D21:N37-D19-O50:Z1*Z1", { en: "rejoice", chs: "非常高兴" }),
    new Vocabulary("rSwt", "D21:N37-G43-X1:D19-Y1:Z2", { en: "joy", chs: "欢愉，快乐" }),
    new Vocabulary("rmT", "D21:V13-A1", { en: "man, men, mankind, Egyptians", chs: "人，人们，人类，埃及人" }),
    new Vocabulary("rmTt", "D21:V13:X1-A1-Z2a", { en: "(collective n.) men, mankind", chs: "（集合名词）人，人类" }),
    new Vocabulary("rkrk", "D21:V31-D21:V31-D54", { en: "creep", chs: "匍匐" }),
    new Vocabulary("rkrk", "D21:V31-D21:V31-I14", { en: "snake", chs: "蛇" }),
    new Vocabulary("rkrk", "D21:V31-D21:V31-M2-Z3", { en: "a creeping plant", chs: "一种蔓延的植物" }),
    new Vocabulary("rqHt", "D21:V31-V28-X1-Q7", { en: "heat", chs: "加热" }),
    new Vocabulary("rqH", "D21:V31-V28-Q7", { en: "light fire", chs: "点火" }),
    new Vocabulary("rqH", "D21:V31-V28-G43-Q7-Z3", { en: "flames", chs: "火焰" }),
    new Vocabulary("rx", "D21:AA1-Y1a", { en: "know; knowledge", chs: "知道；智慧" }),
    new Vocabulary("rx", "D21:AA1-Y1:A1", { en: "wise man", chs: "智者" }),
    new Vocabulary("rxxt", "D21:AA1-AA1:Y1:X1", { en: "wisdom", chs: "智慧" }),
    new Vocabulary("kA", "D28:Z1", { en: "soul, spirit, essence (of a being), personality, fortune, will (of king), kingship, goodwill, phantom", chs: "灵魂、精神、生命的本质、个性、命运、王之意志、王权、善意、魂灵" }),
    new Vocabulary("kA", "D29", { en: "soul, spirit, essence (of a being), personality, fortune, will (of king), kingship, goodwill, phantom", chs: "灵魂、精神、生命的本质、个性、命运、王之意志、王权、善意、魂灵" }),
    new Vocabulary("Xnn", "D33:N35:N35-A24", { en: "(v.) disturb, interfere with (persons, commands), confound (truth) ", chs: "（动词）扰乱，干扰（人或命令），使混淆（真相）" }),
    new Vocabulary("aHA", "D34", { en: "warrior", chs: "战士" }),
    new Vocabulary("aHA", "D34-A24", { en: "fight", chs: "战斗" }),
    new Vocabulary("aHAa", "D34-A24-D36:Z1", { en: "go to war", chs: "去战斗" }),
    new Vocabulary("nn", "D35:N35", { en: " (negative part.) not", chs: "不，否" }),
    new Vocabulary("a", "D36:Y1"),
    new Vocabulary("a", "D36:Z1"),
    new Vocabulary("am", "D36-G17-A2", { en: "swallow", chs: "吞咽" }),
    new Vocabulary("am", "D36-G17-F10-A2", { en: "swallow; breath in, absorb; know", chs: "吞咽；吸入，吸收；了解" }),
    new Vocabulary("xrp", "D44", { en: "provide", chs: "提供" }),
    new Vocabulary("wab", "D60"),
    new Vocabulary("HAt", "F4:D36", { en: "beginning", chs: "开端，起始，开始" }),
    new Vocabulary("HAwty", "F4-G43-X1:Z4-D54", { en: "the foremost", chs: "最开始的，最先的" }),
    new Vocabulary("am", "F10", { en: "know", chs: "知道" }),
    new Vocabulary("wsr", "F12", { en: "powerful", chs: "强大的" }),
    new Vocabulary("wsr", "F12-S29-D21", { en: "powerful", chs: "强大的" }),
    new Vocabulary("wsr", "F12-S29-D21:A1", { en: "wealthy man", chs: "富有的人" }),
    new Vocabulary("wpwAwt", "F13:N31-N31:N31-A40", { en: "Wepwawet", chs: "乌普奥特" }),
    new Vocabulary("sDm", "F21", { en: "hear (voice etc.), hear of (something), listen (to), obey, understand, judge, satisfy (conditions)", chs: "听（声音等），听说（某事），听（取），服从，理解，判断，满足（条件）" }),
    new Vocabulary("sDm", "F21-G17", { en: "hear (voice etc.), hear of (something), listen (to), obey, understand, judge, satisfy (conditions)", chs: "听（声音等），听说（某事），听（取），服从，理解，判断，满足（条件）" }),
    new Vocabulary("sDmi", "F21-G17-M17-A1", { en: "judge, hearers", chs: "审判者，听众" }),
    new Vocabulary("idn", "F21:W24", { en: "deputy", chs: "副手" }),
    new Vocabulary("msDr", "F21:Z1", { en: "ear", chs: "耳朵" }),
    new Vocabulary("pHwy", "F22", { en: "hinder parts, hind quarters", chs: "后部，后臀部" }),
    new Vocabulary("pHww", "F22:F22-F22", { en: "marshlands", chs: "沼泽地" }),
    new Vocabulary("wHmt", "F25-X1:Z1", { en: "hoof", chs: "蹄" }),
    new Vocabulary("ms", "F31-A17", { en: "child", chs: "孩子" }),
    new Vocabulary("mst", "F31-S29-X1-B3", { en: "mother", chs: "母亲" }),
    new Vocabulary("ms", "F31-S29-Z5", { en: "child", chs: "孩子" }),
    new Vocabulary("Xt", "F32", { en: "belly, womb, body, sole (of foot)", chs: "腹部，子宫，身体，脚底" }),
    new Vocabulary("ib", "F34:Z1", { en: "heart, mind, understanding, intelligence, will, desire, mood, wish", chs: "心、思想、理解、智慧、意志、欲望、情绪、愿望" }),
    new Vocabulary("Xrd", "F32:D21-D46-A17-A1"),
    new Vocabulary("nfr", "F35", { en: "beauty", chs: "美丽" }),
    new Vocabulary("nfrt", "F35-D21:X1", { en: "good things", chs: "好东西" }),
    new Vocabulary("nfrw", "F35-F35-F35", { en: " beauty, goodness, young people (Book of the Dead)", chs: "美丽、善良、年轻人（《亡者之书》）" }),
    new Vocabulary("nfr", "F35-I9:D21", { en: "good", chs: "好" }),
    new Vocabulary("nfr", "F35-Z1", { en: "beauty, good, kindness, goodness, happiness, good fortune; heart and wind-pipe", chs: "美丽、善良、仁慈、幸福、好运；心脏与气管" }),
    new Vocabulary("smAyt", "F36-G1-M17a-X1-A24-A1:Z2", { en: "association, confederacy", chs: "协会，联合会" }),
    new Vocabulary("smA", "F36-G1-Y1a", { en: "unite, join (a company), associate (with), arrive (in), partake (of), make ready (a boat)", chs: "联合，加入（陪伴），与……结伴，到达（某地），参与，准备（船只）" }),
    new Vocabulary("Aw", "F40-G43", { en: "long, length (of space, time)", chs: "长，（空间、时间的）长度" }),
    new Vocabulary("Aw", "F40-G43-D41", { en: "(n.) length (of space)", chs: "（名词）（空间的）长度" }),
    new Vocabulary("Aw", "F40-Z7-Z6", { en: "death", chs: "死亡" }),
    new Vocabulary("spr", "F42:D21-A2", { en: "appeal to, petition (someone), make petition", chs: "呼吁，向（某人）请愿，请愿" }),
    new Vocabulary("spr", "F42:Z1-F51", { en: "arrive, reach, come", chs: "到达，抵达，来到" }),
    new Vocabulary("iwat", "F44:X1-Y1:Z2", { en: "inheritance, heritage", chs: "继承，遗产" }),
    new Vocabulary("idt", "F45-F51b"), //?
    new Vocabulary("pXr", "F46", { en: "turn, turn about", chs: "转，转向" }),
    new Vocabulary("pXr", "F46:D21-D54", { en: "perambulate (a hall), circumambulate (walls), pervade (hearts), unroll (a papyrus)", chs: "（大厅）漫步，环绕（城墙），遍布（内心），展开（纸草）" }),
    new Vocabulary("pXrwr", "F46:D21-D54-G36:D21-N36:N23-Z1", { en: "River Euphrates", chs: "幼发拉底河" }),
    new Vocabulary("pXrwr", "F46:D21-G36:D21-N35a-N36", { en: "River Euphrates", chs: "幼发拉底河" }),
    new Vocabulary("pXrwr", "F46:D21-G36:N36", { en: "River Euphrates", chs: "幼发拉底河" }),
    new Vocabulary("wsir", "F51a:D21-A40", { en: "Osiris", chs: "奥西里斯" }),
    new Vocabulary("Hr", "G5-A40", { en: "Horus", chs: "荷鲁斯" }),
    new Vocabulary("Hrnbw", "G8", { en: "Falcon of Gold, royal title", chs: "金隼，王室头衔" }),
    new Vocabulary("mwt", "G14-X1-B1", { en: "mother", chs: "母亲" }),
    new Vocabulary("nbty", "G16", { en: "The Two Ladies", chs: "双女神" }),
    new Vocabulary("mXnty", "G17-D33:N35-X1:P1-U33-M17-G7", { en: "ferryman", chs: "摆渡人" }),
    new Vocabulary("mXnt", "G17-D33:N35-X1:P4", { en: "ferry boat", chs: "渡船" }),
    new Vocabulary("Ax", "{G25-AA1}", { en: "spirit", chs: "精神" }),
    new Vocabulary("gmHsw", "G28-G17-V28-S29-G158A-A40", { en: "hawk", chs: "鹰（隼）" }),
    new Vocabulary("bA", "G29", { en: "possess a soul, be a soul", chs: "拥有灵魂，成为灵魂" }),
    new Vocabulary("bAt", "G29-Y8A", { en: "symbol of Hathor", chs: "哈托尔（哈索尔）的标志物" }),
    new Vocabulary("bAw", "G30", { en: "souls (of dead)", chs: "（死者的）灵魂" }),
    new Vocabulary("baH", "G32", { en: "abundance", chs: "丰富" }),
    new Vocabulary("aq", "G35", { en: "enter (into)", chs: "进入" }),
    new Vocabulary("Aqyt", "{G35-X1}", { en: "female servant", chs: "女奴隶" }),
    new Vocabulary("wr", "G36", { en: "great; swallow (bird)", chs: "伟大；燕子" }),
    new Vocabulary("wrr", "G36:D21", { en: "great, much, many, eldest, important", chs: "伟大，许多，年长，重要" }),
    new Vocabulary("wr", "G36:D21-A1", { en: "great one, magnate, chief, ruler (of foreign land)", chs: "伟人，权贵，首领（外国土地的统治者）" }),
    new Vocabulary("wrmwt", "G36:D21-G17-X1-O169-O169-O169", { en: "roofing, awnings", chs: "（屋顶）棚架，遮篷" }),
    new Vocabulary("wrt", "G36:X1-P13", { en: "sacred barque", chs: "圣船" }),
    new Vocabulary("gb", "G38-D58-A40", { en: "Geb", chs: "盖布" }),
    new Vocabulary("Apd", "G39", { en: "duck, bird (in general)", chs: "鸭子，鸟类（一般）" }),
    new Vocabulary("wiA", "G43-M17-G1-P4A", { en: "sacred barque", chs: "圣船（神舟）" }),
    new Vocabulary("whn", "G43-O4:N35-O118", { en: "throw down (fence), fall off (of scab)", chs: "推倒（栅栏），（痂）脱落" }),
    new Vocabulary("wsSt", "G43-S29-N37:X1-Aa3A", { en: "urine", chs: "尿" }),
    new Vocabulary("Dd", "{I10-D46}", { en: "say, speak, speak of, utter (speech), recite (spell), tell (to), expect", chs: "说，讲，述及，说出（言语），背诵（咒语），告诉（某人），期望" }),
    new Vocabulary("sA", "G39-A1", { en: "son", chs: "儿子" }),
    new Vocabulary("sA", "G39", { en: "land measure of 1/8 aroura", chs: "土地度量（1/8 阿鲁拉）" }),
    new Vocabulary("sAt", "{G39-X1}-B1", { en: "daughter", chs: "女儿" }),
    new Vocabulary("sA", "{G39-N5}", { en: "Son of Rē‘", chs: "拉之子" }),
    new Vocabulary("pA", "G40", { en: "(demon. and def. art.) this, the", chs: "这个" }),
    new Vocabulary("wHyt", "G43-V28-X1:N25", { en: "village", chs: "村庄" }),
    new Vocabulary("wHyt", "G43-V28-X1:O49", { en: "village", chs: "村庄" }),
    new Vocabulary("wDAt", "G43-U29-G1-X1:D10", { en: "the uninjured Eye of Horus", chs: "荷鲁斯之眼" }),
    new Vocabulary("wDAyt", "G43-U28-M17a-X1:O1", { en: "mythical abode of Amen-Rē‘", chs: "阿蒙拉的神所" }),
    new Vocabulary("sSy", "G48", { en: "nest", chs: "巢穴" }),
    new Vocabulary("snD", "G54-A2", { en: "fear, respect", chs: "害怕，敬畏" }),
    new Vocabulary("Sw", "H6-G43-A40", { en: "Shu", chs: "舒" }),
    new Vocabulary("DnH", "H5", { en: "wing", chs: "翅膀" }),
    new Vocabulary("SA", "H6-G43-E12", { en: "pig", chs: "猪" }),
    new Vocabulary("Ast", "H8:X1-B1", { en: "Isis", chs: "伊西斯" }),
    new Vocabulary("sbk", "I5a-A40", { en: "Sobek", chs: "索贝克" }),
    new Vocabulary("kmt", "I6-G17-X1:O49", { en: "the Black Land, Egypt", chs: "黑土地，埃及" }),
    new Vocabulary("Dt", "{I10-X1}", { en: "estate", chs: "庄园" }),
    new Vocabulary("Dt", "I10:Z1", { en: "cobra", chs: "眼镜蛇" }),
    new Vocabulary("Dt", "I10:X1-I13", { en: "cobra", chs: "眼镜蛇" }),
    new Vocabulary("xpr", "L1:D21", { en: "exist, be, come into being, become, change (into), occur, happen, come to pass", chs: "存在，产生，变成，发生，经过" }),
    new Vocabulary("xprw", "L1-D21:Z2", { en: "form, shape, modes of being", chs: "形式，形状，存在的模式" }),
    new Vocabulary("xprr", "L1-Z1", { en: "dung beetle, scarab", chs: "粪金龟，圣甲虫" }),
    new Vocabulary("bit", "L2-X1:Z1", { en: "bee", chs: "蜜蜂" }),
    new Vocabulary("sSn", "M9-Z1", { en: "lotus", chs: "莲花" }),
    new Vocabulary("HAmw", "M16-G1-G17-G43-G52-A24", { en: "fisherman", chs: "钓者，渔民" }),
    new Vocabulary("HAHA", "M16-G1-M16-G1-D54", { en: "go astray; stumble", chs: "迷路，迷失；出差错" }),
    new Vocabulary("sw", "M23-G43", { en: "(prn. compound) he, she, it", chs: "（依附代词）他，她，它" }),
    new Vocabulary("sw", "M23-G43", { en: "(dependent prn.) he, him, it", chs: "（独立代词）他，她，它" }),
    new Vocabulary("sw", "M23-G43", { en: "(non-enclitic part.) (not translated)", chs: "不译" }),
    new Vocabulary("nsw", "M23-X1:N35", { en: "King of Upper Egypt, king", chs: "上埃及之王，国王" }),
    new Vocabulary("nsw", "M23-X1:N35-A40", { en: "King", chs: "国王" }),
    new Vocabulary("rsw", "M24-G43-O49", { en: "the South land", chs: "南方之地" }),
    new Vocabulary("rsw", "M24-G43-P5", { en: "south-wind", chs: "南风" }),
    new Vocabulary("rsy", "M24-Z4:N23", { en: "South; southern", chs: "南，南方的" }),
    new Vocabulary("SmAw", "M26", { en: "Upper Egypt, Upper Egyptian", chs: "上埃及，上埃及人" }),
    new Vocabulary("pt", "N1", { en: "sky, heaven", chs: "天空，天堂" }),
    new Vocabulary("xAwy", "N2", { en: "night", chs: "夜晚" }),
    new Vocabulary("hrw", "N5:Z1", { en: "day, daytime", chs: "白天，白昼" }),
    new Vocabulary("ra", "N6:Z1", { en: "Re", chs: "拉" }),
    new Vocabulary("sbA", "N14:Z1", { en: "star", chs: "星星" }),
    new Vocabulary("mw", "N35a", { en: "water; rain; semen", chs: "水；雨；精液" }),
    new Vocabulary("mw", "N35a-M17a-N35a", { en: "water; rain; semen", chs: "水；雨；精液" }),
    new Vocabulary("mwyt", "N35a-M17a-X1:D53", { en: "urine", chs: "尿" }),
    new Vocabulary("sS", "O34:N37-Z9:D54", { en: "open", chs: "打开" }),
    new Vocabulary("sS", "O34:N37-Z9:Y1", { en: "open", chs: "打开" }),
    new Vocabulary("sS", "O34:N37:Z9:Y1", { en: "open", chs: "打开" }),
    new Vocabulary("Sft", "N37:I9-X1-F7", { en: "ram's head", chs: "公羊头" }),
    new Vocabulary("SfSft", "N37:I9-N37:I9-X1-F7", { en: "dignity", chs: "尊严，尊贵" }),
    new Vocabulary("pw", "{Q3-G43}", { en: "(demon.) this; (int.) who ?, what ?, whichever", chs: "这个；谁；什么；无论哪个" }),
    new Vocabulary("smi", "S29-W19", { en: "(n.) report, acknowledgement (of letter)", chs: "报告，确认函" }),
    new Vocabulary("smi", "S29-W19", { en: "(v.) report, make report, complain, announce, proclaim", chs: "提交报告，投诉，宣布，宣告" }),
    new Vocabulary("smi", "S29-W19-M17-A2", { en: "(n.) report, acknowledgement (of letter)", chs: "报告，确认函" }),
    new Vocabulary("smi", "S29-W19-M17-A2", { en: "(v.) report, make report, complain, announce, proclaim", chs: "提交报告，投诉，宣布，宣告" }),
    new Vocabulary("anxt", "S34-D10", { en: "eye of deity", chs: "神之眼" }),
    new Vocabulary("anx", "S34-N35:AA1", { en: "live, life", chs: "生活，生命" }),
    new Vocabulary("anxt", "S34-N35:AA1*X1-D10", { en: "eye of deity", chs: "神之眼" }),
    new Vocabulary("anx", "S34-N35:AA1-A1", { en: "person", chs: "人" }),
    new Vocabulary("anx", "S34-N35:AA1-A2", { en: "swear, oath", chs: "发誓，誓言" }),
    new Vocabulary("mdt", "S43-D46:X1-A2", { en: "speech, words", chs: "话，文字，语言" }),
    new Vocabulary("anx", "S34-Z1", { en: "sandal strap", chs: "凉鞋带" }),
    new Vocabulary("anx", "S34-Z1:N34", { en: "mirror", chs: "镜子" }),
    new Vocabulary("mAA", "U3", { en: "see, look upon, regard, see to, inspect, look on", chs: "看，注视，注意，查看，检查，观察" }),
    new Vocabulary("mAat", "U5:D36-X1-H6-Y1:Z2", { en: "(adv.) truth, right-doing, righteousness, justice, rightness, orderly management", chs: "（副词）真理，正直，正义，公正，正确性，有序管理" }),
    new Vocabulary("mAa", "U4-D36:Y1", { en: "lead, guide, direct, send, despatch, throw out, steer, extend, paddle, set out", chs: "引导、带领、指示、发送、派遣、扔出、驾驶、伸展、划桨、出发" }),
    new Vocabulary("mAa", "U5:D36-Y1a", { en: "(adj. and v.) true (of speech), real, just, righteous, true (to), loyal (to)", chs: "（形容词和动词）真实的（关于言语的），真实、公正、正直、正确的（对……而言），忠诚的（对……而言）" }),
    new Vocabulary("mri", "U7:D21-A2", { en: "(v.) love, want, wish, desire", chs: "爱，想要，愿，渴望" }),
    new Vocabulary("mrwty", "U7:D21-G43-M17a-X1:Z4", { en: "the well-beloved", chs: "深受喜爱的" }),
    new Vocabulary("mrwty", "U7:D21-G43-U33-M17", { en: "the well-beloved", chs: "深受喜爱的" }),
    new Vocabulary("mrwty", "U7:D21-G43-X1:Z4-A2-A1", { en: "the well-beloved", chs: "深受喜爱的" }),
    new Vocabulary("Hapy", "V28-D36:Q3-N35a", { en: "Nile", chs: "尼罗河" }),
    new Vocabulary("gs", "W11:D21-A2", { en: "(v.) be silent, be quiet, be still, cease, desist (from)", chs: "（动词）保持沉默，安静，静止，停止，放弃" }),
    new Vocabulary("gs", "W11:D21-A2", { en: "(n.) silence", chs: "（名词）沉默" }),
    new Vocabulary("grw", "W11:D21-A2-A1", { en: "the silent man", chs: "沉默的人" }),
    new Vocabulary("grw", "W11:D21-G43-A2-A1", { en: "the silent man", chs: "沉默的人" }),
    new Vocabulary("Hsi", "W14", { en: "(v.) favour (someone), praise (someone)", chs: "喜爱，称赞" }),
    new Vocabulary("Hsyt", "W14-M17a-X1", { en: "(fem.) favoured, praised one", chs: "被喜爱的人，被称赞的人" }),
    new Vocabulary("xnty", "W17", { en: "of place, who, which is in front of; southern; south of; of rank or position, who is at the head of, foremost; of degree, principal; of time, which is at the beginning of a year; of shape, protruding", chs: "在……前面的；向南的；在……以南的；有地位或职位的，处于首位的；主要的；时间上，一年开始时的；形状上突出的" }),
    new Vocabulary("xnty", "W18", { en: "of place, who, which is in front of; southern; south of; of rank or position, who is at the head of, foremost; of degree, principal; of time, which is at the beginning of a year; of shape, protruding", chs: "在……前面的；向南的；在……以南的；有地位或职位的，处于首位的；主要的；时间上，一年开始时的；形状上突出的" }),
    new Vocabulary("xnty", "W18-N35:X1", { en: "of place, who, which is in front of; southern; south of; of rank or position, who is at the head of, foremost; of degree, principal; of time, which is at the beginning of a year; of shape, protruding", chs: "在……前面的；向南的；在……以南的；有地位或职位的，处于首位的；主要的；时间上，一年开始时的；形状上突出的" }),
    new Vocabulary("xnty", "W18-N35:X1*Z4", { en: "of place, who, which is in front of; southern; south of; of rank or position, who is at the head of, foremost; of degree, principal; of time, which is at the beginning of a year; of shape, protruding", chs: "在……前面的；向南的；在……以南的；有地位或职位的，处于首位的；主要的；时间上，一年开始时的；形状上突出的" }),
    new Vocabulary("nwt", "W24-W24:X1*W24:N1-B1", { en: "(divinity) Nut (goddess)", chs: "努特" }),
    new Vocabulary("nwt", "W24*X1:N1", { en: "(divinity) Nut (goddess)", chs: "努特" }),
    new Vocabulary("nwt", "W24*X1:N1-A40", { en: "(divinity) Nut (goddess)", chs: "努特" }),
    new Vocabulary("nwt", "W24*X1:N1-B1", { en: "(divinity) Nut (goddess), the sky", chs: "努特；天空" }),
    new Vocabulary("ini", "W25:N35", { en: "bring, fetch, carry off, remove, overcome,  reach, attain, buy, appoint, use", chs: "带来，取来，带走，移除，克服，达到，获得，购买，任命，使用" }),
    new Vocabulary("inHrt", "W25:N35-V28-D2:D21-X1:N31-G7", { en: "Onuris", chs: "奥努里斯/安胡尔" }),
    new Vocabulary("tkA", "X1:D28-Q7", { en: "(v.) illumine", chs: "点亮，照亮" }),
    new Vocabulary("tkA", "X1:D28-Q7", { en: "(n.) torch, taper, flame", chs: "（名词）火炬，锥形物，火焰" }),
    new Vocabulary("tw", "{X1-G43}", { en: "you", chs: "你" }),
    new Vocabulary("tw", "X1-G43", { en: "you", chs: "你" }),
    new Vocabulary("twt", "{X1-G43-X1}", { en: "statue, image, figure, likeness", chs: "雕像、形象、人物、肖像" }),
    new Vocabulary("twt", "{X1-G43-X1}-A53", { en: "statue, image, figure, likeness", chs: "雕像、形象、人物、肖像" }),
    new Vocabulary("tfnt", "X1:I9-N35:X1-I12", { en: "(divinity) Tefnet", chs: "泰芙努特" }),
    new Vocabulary("tfnt", "X1:I9-W24:X1-I12", { en: "(divinity) Tefnet", chs: "泰芙努特" }),
    new Vocabulary("sS", "Y3-A1", { en: "scribe", chs: "书吏" }),
    new Vocabulary("sS", "Y3:Y1", { en: "(v.) write, inscribe, paint, draw, enrol (troops)", chs: "（动词）书写、刻写、绘画、绘制、征召（军队）" }),
    new Vocabulary("sS", "Y3:Y1", { en: " (n.) writing, depiction, record, papyrus roll, letter, document", chs: "（名词）书写、描绘、记录、纸莎草卷轴、信件、文件" }),
    new Vocabulary("xmnyw", "Z1*Z1*Z1*Z1:Z1*Z1*Z1*Z1-M17a-G43-A40-Z3", { en: "Ogdoad", chs: "奥格多" }),
    new Vocabulary("xr", "AA1:D21", { en: "prep. with; near; under a king; speak to; by, of agent, end; aux. vb. so says", chs: "（介词）与……一起；靠近，在……附近；在国王之下/在国王治下；对……说；由（引出施事者）；尽头，末尾。（助动词）如此说，写道" }),
    new Vocabulary("xrp", "AA1:D21-Q3:D44", { en: "(1) govern, control, administer, act as controller, direct someone (of one's heart), drive cattle, lead, get ahead with work, undertake works; (2) bring, provide, make offering of, dedicate.", chs: "(1) 统治，控制，管理，担任管理者，指引某人（就其心而言？），赶牛，带领，推进工作，承担工程；(2) 带来，提供，献祭，奉献。" }),
    new Vocabulary("xmt", "AA1:D52", { en: "intend, plan,  take thought for, expect, anticipate", chs: "打算，计划，考虑，预期，预想" }),
    new Vocabulary("xmt", "{AA1-D52-X1}", { en: "intend, plan,  take thought for, expect, anticipate", chs: "打算，计划，考虑，预期，预想" }),
    new Vocabulary("xmt", "{AA1-D52-X1}-Z3a", { en: "intend, plan,  take thought for, expect, anticipate", chs: "打算，计划，考虑，预期，预想" }),
    new Vocabulary("xmt", "{AA1-D52-X1}-Z3a-A2", { en: "intend, plan,  take thought for, expect, anticipate", chs: "打算，计划，考虑，预期，预想" }),
    new Vocabulary("xnty", "AA1:N35:X1", { en: "of place, who, which is in front of; southern; south of; of rank or position, who is at the head of, foremost; of degree, principal; of time, which is at the beginning of a year; of shape, protruding", chs: "在……前面的；向南的；在……以南的；有地位或职位的，处于首位的；主要的；时间上，一年开始时的；形状上突出的" }),
    new Vocabulary("xx", "AA1:AA1-F10", { en: "throat", chs: "喉咙" }),
];

// ---- 音素实例（单点注册：只写在 maps.js 的 PHONEME_TABLE 里） ----
// 每个（发音, 码）登记项生成一个 Phoneme：
//   · 同音异形（一个发音多个码）→ PDMBox 多条并列单元
//   · 一形多音（一个码多个发音）→ 多个发音条目，各自可检索
// 音素不参与 VMBox 词匹配（VM 只显示 Vocabulary 与 Ligature），故无释义字段。
var PHONEME_UNITS = (function () {
    const seen = new Set();
    const list = [];
    for (const row of PHONEME_ROWS) {
        const key = row.pron + "|" + row.code;
        if (seen.has(key)) continue;      // 重复登记（同一发音同一码）只留一条
        seen.add(key);
        const unit = new Phoneme(row.pron, row.code);
        if (unit.code && hg(unit.code)) list.push(unit);   // 码不在字体表中 → 不生成
    }
    return list;
})();

// ---- 变体族：互为变体的词汇**释义一定相同** ----
// 变体条目的写法：第 3 参数为 null、第 4 参数为母词汇的 MdC：
//     new Vocabulary("pron", "变体的 MdC", null, "母词汇的 MdC"),
// 这里在装配后把变体的 meaning 指向母词汇的**同一个对象**——
// 因此修改母词汇的释义，全族自动同步（结构上不可能不一致）。
var VOCAB_BY_MDC = (function () {
    const map = {};
    for (const u of VOCABULARY) { if (u.mdC && !map[u.mdC]) map[u.mdC] = u; }
    return map;
})();
(function linkVariants() {
    for (const u of VOCABULARY) {
        if (!u.variantOf) continue;
        const parent = VOCAB_BY_MDC[u.variantOf];
        if (!parent) {
            console.warn("[vocabulary] 变体的母词汇不存在: " + u.pron + " → " + u.variantOf);
            continue;
        }
        u.parent = parent;
        u.meaning = parent.meaning;     // 共享对象：释义一定相同
    }
})();

/** 某母词汇的全部变体（不含母词汇本身）。 */
function variantsOf(mdC) {
    const any = VOCAB_BY_MDC[mdC];
    if (!any) return [];
    const parent = any.parent || any;
    return VOCABULARY.filter(u => u.parent === parent);
}

/** 变体族：给定任一成员的 MdC，返回 { parent, members }（母词汇 + 全部变体）。 */
function variantFamily(mdC) {
    const any = VOCAB_BY_MDC[mdC];
    if (!any) return null;
    const parent = any.parent || any;
    return { parent: parent, members: VOCABULARY.filter(u => u === parent || u.parent === parent) };
}

// ---- VMBox 匹配集合：词汇 + 连字（音素不进 VM，其匹配全部在 PDMBox） ----
var SEMANTICS = VOCABULARY
    .concat(Object.keys(LIGATURES).map(function (name) { return LIGATURES[name]; }));

// 按发音精确查找语义单位（VM 集合：词汇 / 连字）
function findSemantics(pron) {
    for (const u of SEMANTICS) {
        if (u.pron === pron) return u;
    }
    return null;
}

// 按 MdC 前缀检索词汇（返回词条数组；供外部快速查询）
function lookUp(MdC) {
    if (!MdC || typeof MdC !== "string") {
        return [];
    }
    return VOCABULARY.filter((vocab) => vocab.code && vocab.code.startsWith(MdC));
}
