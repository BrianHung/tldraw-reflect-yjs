import {
  TLUiOverrides,
  TLComponents,
  useTools,
  DefaultToolbar,
  useIsToolSelected,
  TldrawUiMenuItem,
  SelectToolbarItem,
  HandToolbarItem,
  DrawToolbarItem,
  EraserToolbarItem,
  ArrowToolbarItem,
  RectangleToolbarItem,
  EllipseToolbarItem,
  DiamondToolbarItem,
  TriangleToolbarItem,
  TrapezoidToolbarItem,
  RhombusToolbarItem,
  HexagonToolbarItem,
  CloudToolbarItem,
  StarToolbarItem,
  OvalToolbarItem,
  ArrowLeftToolbarItem,
  ArrowUpToolbarItem,
  ArrowRightToolbarItem,
  ArrowDownToolbarItem,
  LineToolbarItem,
  HighlightToolbarItem,
  LaserToolbarItem,
} from "tldraw";

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools.codeblock = {
      id: "codeblock",
      icon: "code",
      label: "CodeBlock",
      kbd: "c",
      onSelect: () => {
        editor.setCurrentTool("codeblock");
      },
    };
    tools.textblock = {
      id: "textblock",
      icon: "tool-text",
      label: "TextBlock",
      kbd: "t",
      onSelect: () => {
        editor.setCurrentTool("textblock");
      },
    };
    return tools;
  },
};

export const components: TLComponents = {
  Toolbar(props) {
    const tools = useTools();

    const isCodeBlockSelected = useIsToolSelected(tools["codeblock"]);
    const isTextBlockSelected = useIsToolSelected(tools["textblock"]);

    return (
      <DefaultToolbar {...props}>
        <SelectToolbarItem />
        <HandToolbarItem />
        <DrawToolbarItem />
        <EraserToolbarItem />
        <ArrowToolbarItem />
        <TldrawUiMenuItem {...tools["codeblock"]} isSelected={isCodeBlockSelected} />
        <TldrawUiMenuItem {...tools["textblock"]} isSelected={isTextBlockSelected} />
        <RectangleToolbarItem />
        <EllipseToolbarItem />
        <DiamondToolbarItem />
        <TriangleToolbarItem />
        <TrapezoidToolbarItem />
        <RhombusToolbarItem />
        <HexagonToolbarItem />
        <CloudToolbarItem />
        <StarToolbarItem />
        <OvalToolbarItem />
        <ArrowLeftToolbarItem />
        <ArrowUpToolbarItem />
        <ArrowRightToolbarItem />
        <ArrowDownToolbarItem />
        <LineToolbarItem />
        <HighlightToolbarItem />
        <LaserToolbarItem />
      </DefaultToolbar>
    );
  },
};
