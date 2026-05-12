from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


OUT = Path("project_structure_status_and_next_steps_cn.docx")


def paragraph(text: str, style: str | None = None) -> str:
    style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{style_xml}<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/>'
        '<w:numId w:val="1"/></w:numPr></w:pPr>'
        f"<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"
    )


def code_block(lines: list[str]) -> str:
    parts = []
    for line in lines:
        parts.append(
            '<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr>'
            f"<w:r><w:t xml:space=\"preserve\">{escape(line)}</w:t></w:r></w:p>"
        )
    return "".join(parts)


def build_body() -> str:
    today = date.today().isoformat()
    body: list[str] = []

    body.append(paragraph("项目结构现状与收尾说明", "Title"))
    body.append(paragraph(f"更新日期：{today}"))

    body.append(paragraph("一、当前结论", "Heading1"))
    for item in [
        "后端模块迁移已完成：旧的 control_modules/ 和 chart_modules/ 已删除。",
        "app.py 已精简为路由层，业务动作集中到 models/simple_linear_regression/model.py。",
        "控制面板和图表数据模块已归入 models/simple_linear_regression/controls 与 charts。",
        "前端大脚本已拆分到 static/js/，templates/index.html 只保留页面结构、样式、两个 Jinja 常量和脚本引用。",
        "当前验证包括 Python compileall、Node JS 语法检查、Flask test client 资源检查和 Flask 重启连通性检查。",
    ]:
        body.append(bullet(item))

    body.append(paragraph("二、主要目录结构", "Heading1"))
    body.append(
        code_block(
            [
                "simple_linear_regression1/",
                "├─ app.py",
                "├─ core/registry.py",
                "├─ models/simple_linear_regression/",
                "│  ├─ model.py",
                "│  ├─ controls/",
                "│  └─ charts/",
                "├─ static/js/",
                "│  ├─ api.js",
                "│  ├─ state_runtime.js",
                "│  ├─ schema_registry.js",
                "│  ├─ control_renderers.js",
                "│  ├─ chart_renderers.js",
                "│  ├─ view_renderers.js",
                "│  ├─ preprocess_page.js",
                "│  ├─ train_page.js",
                "│  ├─ predict_page.js",
                "│  ├─ student_page.js",
                "│  ├─ theory_page.js",
                "│  └─ app_shell.js",
                "└─ templates/index.html",
            ]
        )
    )

    body.append(paragraph("三、前端拆分结果", "Heading1"))
    for item in [
        "api.js：封装通用 POST 和 runAction。",
        "state_runtime.js：维护全局状态、DOM 工具、图表生命周期、GridStack 布局状态。",
        "schema_registry.js：维护 schema、图表 metadata、标题和说明兜底逻辑。",
        "control_renderers.js：生成右侧控制面板。",
        "chart_renderers.js：生成 ECharts option。",
        "view_renderers.js：生成表格、信息卡片、计算过程等 HTML。",
        "preprocess_page.js / train_page.js / predict_page.js / student_page.js：分别承载各业务页面流程。",
        "theory_page.js：理论页面和可选 HTML 课程片段加载。",
        "app_shell.js：导航、启动和 resize 绑定。",
    ]:
        body.append(bullet(item))

    body.append(paragraph("四、后端接口", "Heading1"))
    body.append(
        code_block(
            [
                "GET  /",
                "GET  /api/page_schema?page=<page>",
                "GET  /api/chart_registry?page=<page>",
                "POST /api/run_action",
                "POST /api/chart_data",
            ]
        )
    )
    body.append(paragraph("业务动作统一通过 /api/run_action 分发，图表数据统一通过 /api/chart_data 获取。"))

    body.append(paragraph("五、已执行验证", "Heading1"))
    for item in [
        "python -m compileall app.py core models：通过。",
        "node --check static/js/*.js：所有拆分后的 JS 均通过语法检查。",
        "Flask test client：页面、API 和所有静态 JS 均返回 200。",
        "Flask 已重启，127.0.0.1:5000 端口连通。",
    ]:
        body.append(bullet(item))

    body.append(paragraph("六、剩余收尾建议", "Heading1"))
    for item in [
        "浏览器手动点测四个主要页面：预处理、训练评估、预测、学生实验。",
        "可选：把 templates/index.html 中的大段 CSS 拆到 static/css/app.css。",
        "可选：补充轻量自动化测试，覆盖 /api/run_action 和 /api/chart_data 的关键动作。",
        "可选：如果需要版本管理，可在项目根目录初始化 Git 仓库。",
    ]:
        body.append(bullet(item))

    return "".join(body)


def write_docx(path: Path) -> None:
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {build_body()}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>'''
    styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>'''
    numbering_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
    doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>'''

    with ZipFile(path, "w", ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", rels)
        docx.writestr("word/_rels/document.xml.rels", doc_rels)
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", styles_xml)
        docx.writestr("word/numbering.xml", numbering_xml)


if __name__ == "__main__":
    write_docx(OUT)
    print(f"wrote {OUT}")
