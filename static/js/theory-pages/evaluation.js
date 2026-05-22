registerTheoryPageConfig("evaluation", {
  topic: {
    title: "评价指标",
    subtitle: "RMSE、MAE、R² 各管一件事，学生看结果时不能只盯一个数字。",
    bullets: [
      "RMSE 对大误差更敏感。",
      "MAE 更接近平均偏差的直观理解。",
      "R² 描述模型解释房价变化的能力。",
      "判断好坏要把指标和拟合图一起看。"
    ],
    formula: "RMSE 越小越好\nMAE 越小越好\nR² 越接近 1 越好",
    prompt: "评价不是背定义，而是学会拿结果说话。"
  },
  scenario: {
    leadIn: "这一部分我不要求你们会推公式，但要求你们会读结果。",
    explain: [
      "RMSE 大，往往说明存在比较大的偏差样本。",
      "MAE 更适合回答“平均会差多少”。",
      "R² 更像在回答“这条线解释得够不够好”。"
    ],
    demo: [
      "指标对比图讲三个指标的分工。",
      "拟合效果图讲模型结果看起来是否合理。"
    ],
    activity: "学生看结果时，先看趋势图，再看指标，不要反过来。",
    summary: "评价指标的核心是会解释，不是会背定义。"
  },
  studentDeck: {
    title: "评价指标",
    subtitle: "三个指标分工不同，结果判断要结合图像和数字。",
    heroKind: "metriccards",
    slides: [
      {
        title: "RMSE、MAE、R² 各说明什么",
        text: "RMSE 对大误差更敏感，适合发现模型有没有明显失准的样本；MAE 更直观，适合回答平均偏差大概有多少；R² 则用来判断模型对房价变化趋势解释得够不够好。三个指标一起看，结论才稳。",
        image: "metriccards",
        note: "图：RMSE / MAE / R² 对比图。先分清每个指标在看什么。"
      },
      {
        title: "学生看结果怎么判断好坏",
        text: "先看拟合效果图，确认预测线和散点总体趋势是否一致；再看 RMSE、MAE 是否足够小；最后看 R² 是否说明模型具备基本解释能力。如果图像看着不对，哪怕某个指标还行，也要谨慎下结论。",
        image: "fitquality",
        note: "图：拟合效果图。老师会强调“图像趋势”和“评价指标”要互相印证。"
      }
    ]
  }
});
