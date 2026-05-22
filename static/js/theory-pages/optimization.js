registerTheoryPageConfig("optimization", {
  topic: {
    title: "参数优化",
    subtitle: "把 w、b 怎么更新，学习率和 epoch 为什么重要，一次讲透。",
    bullets: [
      "每一轮更新都会同时调整 w 和 b。",
      "学习率决定每一步走多远。",
      "epoch 表示完整训练轮次。",
      "看参数轨迹和 loss 曲线，能判断训练是否稳定。"
    ],
    formula: "w_new = w - lr * dw\nb_new = b - lr * db",
    prompt: "优化不是魔法，就是按规则不断更新参数。"
  },
  scenario: {
    leadIn: "这一部分你们就把自己当成在调一条线：怎么挪，挪多远，挪多少轮。",
    explain: [
      "w 和 b 不是随便改，而是按梯度给出的方向改。",
      "学习率过大容易震荡，过小又会收敛太慢。",
      "epoch 增加后，loss 往往会先明显下降，再逐渐趋稳。"
    ],
    demo: [
      "梯度下降动画讲更新方向。",
      "参数更新轨迹讲参数怎么走。",
      "loss 下降图讲训练有没有变好。"
    ],
    activity: "如果 loss 一直上下跳，先看学习率；如果 loss 降得太慢，再看 epoch 和步长。",
    summary: "参数优化讲的是更新机制和训练节奏。"
  },
  studentDeck: {
    title: "参数优化",
    subtitle: "看懂 w、b 更新，看懂学习率和 epoch 的影响。",
    heroKind: "hill",
    slides: [
      {
        title: "w、b 是怎么更新的",
        text: "老师先讲最核心的更新公式：w_new = w - lr * dw，b_new = b - lr * db。这里 dw、db 是损失函数对参数的偏导，负责告诉我们应该往哪边改；lr 也就是学习率，负责决定这一步改多大。",
        image: "hill",
        note: "图：梯度下降动画。顺着负梯度方向更新，目的是让损失更小。"
      },
      {
        title: "看参数更新轨迹",
        text: "如果把参数变化过程画出来，你会看到 w 和 b 不是瞬间跳到最优，而是一点一点往更合适的位置移动。轨迹平稳，通常说明训练过程比较稳定；轨迹来回摆动，往往说明更新过猛，或者学习率设置得太大。",
        image: "contour",
        note: "图：参数更新轨迹。重点观察路径是平稳靠近还是反复震荡。"
      },
      {
        title: "学习率和 epoch 的影响",
        cards: [
          ["学习率太大", "每一步跨得太远，loss 容易上下跳，甚至直接发散。"],
          ["学习率太小", "每一步太保守，loss 会下降，但训练速度很慢。"],
          ["epoch 变多", "模型会有更多轮机会修正参数，但也要防止训练过头。"],
          ["看 loss 曲线", "loss 持续下降并逐渐趋稳，通常说明当前设置比较合适。"]
        ],
        image: "losstrain",
        note: "图：loss 下降图。老师会结合学习率和 epoch 一起解释训练节奏。"
      }
    ]
  }
});
