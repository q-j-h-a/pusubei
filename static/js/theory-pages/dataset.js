registerTheoryPageConfig("dataset", {
  topic: {
    title: "数据集",
    subtitle: "Boston Housing 不是一堆字段名，而是一组和房价有关的现实线索。",
    bullets: [
      "MEDV 是目标值，表示房价中位数。",
      "RM、LSTAT 是最常拿来讲解的典型特征。",
      "字段必须先读懂含义，模型训练才有解释价值。",
      "散点图能帮助判断特征和房价是否存在明显趋势。"
    ],
    formula: "目标值: MEDV\n常用特征: RM, LSTAT",
    prompt: "先读懂数据代表什么，再去做拟合和预测。"
  },
  scenario: {
    leadIn: "这一步老师最关心的不是你记住字段名，而是你知道这些字段各自在描述什么。",
    explain: [
      "RM 表示平均房间数，往往和房价正相关。",
      "LSTAT 表示低收入人口比例，通常和房价负相关。",
      "MEDV 是模型最终要预测的目标值，不是输入特征。"
    ],
    demo: [
      "字段表帮你读懂数据语义。",
      "散点图帮你判断特征和房价之间的关系。"
    ],
    activity: "看字段时先问自己：它描述的是房屋本身、社区环境，还是经济结构。",
    summary: "这部分要把数据含义和图像观察对应起来。"
  },
  studentDeck: {
    title: "数据集",
    subtitle: "先读懂 Boston 数据字段，再看特征和房价的关系。",
    heroKind: "datasetmap",
    slides: [
      {
        title: "Boston 数据字段怎么读",
        cards: [
          ["MEDV", "目标值。表示房价中位数，是我们最终要预测的结果。"],
          ["RM", "平均房间数。房子越宽敞，通常房价越高。"],
          ["LSTAT", "低收入人口比例。这个比例高，往往对应较低房价。"],
          ["CRIM / PTRATIO", "分别反映犯罪率、师生比，帮助描述社区环境。"]
        ],
        image: "datasetmap",
        note: "图：Boston 数据字段表。重点不是背缩写，而是理解每列的现实含义。"
      },
      {
        title: "特征和房价散点图怎么看",
        text: "同学们看散点图时，不是只看点多不多，而是看整体趋势。RM 和 MEDV 通常呈现比较明显的正向关系；LSTAT 和 MEDV 往往更像反向关系。散点越有趋势，说明这个特征越可能对房价预测有帮助。",
        image: "scatter",
        note: "图：特征与房价散点图。老师会重点讲 RM、LSTAT 这两类典型特征。"
      }
    ]
  }
});
