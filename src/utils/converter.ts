/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import type { Root } from "postcss";
import { parse } from "tolerant-json-parser";
import postcss from "postcss";
import * as postcssJs from "postcss-js";
import { Log } from "./log";
import { TailwindConverter } from "css-to-tailwindcss";
import { nanoid } from "nanoid";
import { isPlainObject } from "./object";
import replaceString from "replace-string";

function wrapCSS(id: string, css: string) {
  return `${id} { ${css} }`;
}

function deepUnwrapAtRule(id: string, atRuleValue: any) {
  if (!isPlainObject(atRuleValue)) {
    return atRuleValue;
  }

  Object.keys(atRuleValue).forEach((itemKey) => {
    const itemValue = atRuleValue[itemKey];

    if (itemKey.startsWith("@")) {
      deepUnwrapAtRule(id, itemValue);
    } else if (isPlainObject(itemValue)) {
      delete atRuleValue[itemKey];
      Object.assign(atRuleValue, itemValue);
    }
  });

  return atRuleValue;
}

function unwrapJSS(id: string, jss: Record<string, any>) {
  const result = jss[id];

  delete jss[id];
  Object.keys(jss).forEach((key) => {
    const jssItem = jss[key];
    if (key.startsWith("@")) {
      result[key] = deepUnwrapAtRule(id, jssItem);
    } else {
      result[replaceString(key, id, "&")] = jssItem;
    }
  });

  return result;
}

export const paperTailwind = vscode.window.createOutputChannel("Paper Tailwind Plugin");

export async function convertToTailwindCSS(input: string, tailwindConverter: TailwindConverter) {
  if (/^\s*\$\{(.+?)\};?\s*$/.test(input)) {
    return input.replace(/^\s*\$\{(.+?)\};?\s*$/, (_match, p1) => replaceTokens(_match));
  } else if (/css`(.+?)`/gs.test(input)) {
    input = input.replaceAll(/css`(.+?)`/gs, (_match, p1) => replaceTokens(p1));

    paperTailwind.appendLine(input);
    paperTailwind.appendLine("");

    const id = nanoid();
    const wrapped = wrapCSS(id, input);
    const converted = await tailwindConverter.convertCSS(wrapped);
    const tailwindClasses = converted.nodes.flatMap((node) => node.tailwindClasses).join(" ");
    return `'${tailwindClasses}'`;
  } else {
    input = replaceTokens(input);

    paperTailwind.appendLine(input);
    paperTailwind.appendLine("");

    const id = nanoid();
    const wrapped = wrapCSS(id, input);
    const converted = await tailwindConverter.convertCSS(wrapped);
    const tailwindClasses = converted.nodes.flatMap((node) => node.tailwindClasses).join(" ");
    return tailwindClasses;
  }

  /* try {
    const id = nanoid();
    const jsObject = parse(input);
    const parsed = await postcss().process(jsObject, {
      parser: postcssJs.parse,
    });
    const converted = await tailwindConverter.convertCSS(wrapCSS(id, parsed.css));
    return JSON.stringify(
      unwrapJSS(id, postcssJs.objectify(converted.convertedRoot as Root)),
      null,
      vscode.window.activeTextEditor?.options.tabSize || 4
    );
  } catch {}

  try {
    const id = nanoid();
    const wrapped = wrapCSS(id, input);
    const converted = await tailwindConverter.convertCSS(wrapped);
    const res = converted.nodes.flatMap((node) => node.tailwindClasses).join(" ");

    // paperTailwind.appendLine(res);
    // paperTailwind.appendLine("");

    return res;
  } catch {}

  try {
    return (await tailwindConverter.convertCSS(input)).convertedRoot.toString();
  } catch (e) {
    Log.error(e);

    return input;
  } */
}

function replaceCssFunctionWithString(input: string): string {
  return input.replaceAll(/css`(.+?)`/gs, (_match, p1) => {
    return `'${p1}'`;
  });
}

function replaceTokens(input: string): string {
  return input.replaceAll(/\$\{(.+?)\}/g, (_match, p1) => {
    const tokenValues: Record<string, string | number> = {
      "typography.fontFamily.sans": '"Roboto"',
      "typography.fontFamily.serif": '"Domine"',
      "typography.fontFamily.fallback": '"Arial"',
      "typography.fontSize.tiny": "8px",
      "typography.fontSize.xxxsmall": "10px",
      "typography.fontSize.xxsmall": "12px",
      "typography.fontSize.xsmall": "14px",
      "typography.fontSize.msmall": "15px",
      "typography.fontSize.small": "16px",
      "typography.fontSize.regular": "18px",
      "typography.fontSize.medium": "22px",
      "typography.fontSize.large": "28px",
      "typography.fontSize.xlarge": "40px",
      "typography.fontSize.xxlarge": "72px",
      "typography.fontStyle.normal": "normal",
      "typography.fontStyle.italic": "italic",
      "typography.fontWeight.regular": "normal",
      "typography.fontWeight.bold": "bold",
      "typography.fontWeight.light": 300,
      "typography.textDecoration.none": "none",
      "typography.textDecoration.underline": "underline",
      "typography.textTransform.none": "none",
      "typography.textTransform.uppercase": "uppercase",
      "typography.textAlign.start": "start",
      "typography.textAlign.center": "center",
      "typography.lineHeight.xsmall": 1,
      "typography.lineHeight.small": 1.2,
      "typography.lineHeight.regular": 1.3,
      "typography.lineHeight.large": 1.4,
      "typography.lineHeight.xlarge": 1.5,
      "typography.lineHeight.xxlarge": 1.7,
      "space.none": "0px",
      "space.xxxsmall": "2px",
      "space.xxsmall": "4px",
      "space.xsmall": "8px",
      "space.small": "12px",
      "space.medium": "16px",
      "space.large": "24px",
      "space.xlarge": "32px",
      "space.xxlarge": "40px",
      "space.xxxlarge": "48px",
      "breakpoint.mobile": 0,
      "breakpoint.desktop": 768,
      "flex.wrap.wrap": "wrap",
      "flex.wrap.nowrap": "nowrap",
      "flex.direction.row": "row",
      "flex.direction.column": "column",
      "flex.direction.rowReverse": "row-reverse",
      "flex.direction.columnReverse": "column-reverse",
      "align.horizontal.left": "flex-start",
      "align.horizontal.right": "flex-end",
      "align.horizontal.center": "center",
      "align.horizontal.spaceBetween": "space-between",
      "align.horizontal.spaceAround": "space-around",
      "align.vertical.top": "flex-start",
      "align.vertical.bottom": "flex-end",
      "align.vertical.center": "center",
      "align.vertical.baseline": "baseline",
      "align.vertical.stretch": "stretch",
      "color.magenta": "var(--color-magenta)",
      "color.magentaLight": "var(--color-magentaLight)",
      "color.salemsfur": "var(--color-salemsfur)",
      "color.royalblue": "var(--color-royalblue)",
      "color.trout": "var(--color-trout)",
      "color.manatee": "var(--color-manatee)",
      "color.snow": "var(--color-snow)",
      "color.botticelli": "var(--color-botticelli)",
      "color.whitelilac": "var(--color-whitelilac)",
      "color.alpine": "var(--color-alpine)",
      "color.red": "var(--color-red)",
      "color.green": "var(--color-green)",
      "color.cararra": "var(--color-cararra)",
      "color.iceWater": "var(--color-iceWater)",
      "color.pro": "var(--color-pro)",
      "color.con": "var(--color-con)",
      "color.black": "var(--color-black)",
      "color.cadetBlue": "var(--color-cadetBlue)",
      "color.riverBed": "var(--color-riverBed)",
      "color.ebony": "var(--color-ebony)",
      "color.goldenSand": "var(--color-goldenSand)",
      "color.inherit": "inherit",
      "colorCodes.magenta": "#E20074",
      "colorCodes.magentaLight": "#F9CCE3",
      "colorCodes.salemsfur": "#171B26",
      "colorCodes.royalblue": "#00A0DE",
      "colorCodes.trout": "#474C59",
      "colorCodes.manatee": "#8D93A6",
      "colorCodes.snow": "#FFFFFF",
      "colorCodes.botticelli": "#CFD5E5",
      "colorCodes.whitelilac": "#EBEFF7",
      "colorCodes.alpine": "#F7F9FC",
      "colorCodes.red": "#EE3F54",
      "colorCodes.green": "#0D8033",
      "colorCodes.cararra": "#E7E6E0",
      "colorCodes.iceWater": "#F2F6FF",
      "colorCodes.ottoman": "#EDFAF2",
      "colorCodes.bridesmaid": "#FEECEE",
      "colorCodes.blackBean": "#0B231A",
      "colorCodes.tamarind": "#381721",
      "colorCodes.black": "#0A0C14",
      "colorCodes.cadetBlue": "#A3AABF",
      "colorCodes.riverBed": "#495166",
      "colorCodes.ebony": "#262C3B",
      "colorCodes.goldenSand": "#F5E198",
      "colorCodes.inherit": "inherit",
      "border.width.none": "0px",
      "border.width.small": "1px",
      "border.width.medium": "2px",
      "border.width.large": "4px",
      "border.radii.medium": "4px",
      "border.radii.large": "8px",
      "border.radii.xlarge": "24px",
      "border.radii.xxlarge": "100px",
      "border.radii.circle": "50%",
      "zindex.lower": 1,
      "zindex.low": 10,
      "zindex.medium": 100,
      "zindex.regular": 500,
      "zindex.high": 700,
      "zindex.higher": 2147483638,
      "columns.1by2": "50%",
      "columns.1by3": "33.33333333333333%",
      "columns.2by3": "66.66666666666666%",
      "columns.1by4": "25%",
      "columns.3by4": "75%",
      "columns.fill": "100%",
      "columns.content": "auto",
      "effect.shadow.flat": "none",
      "effect.shadow.raised": "0 1px 2px rgba(125, 152, 178, 0.2)",
      "effect.shadow.overlay": "0 4px 8px rgba(125, 152, 178, 0.2)",
      "effect.shadow.sticky": "0 8px 16px rgba(125, 152, 178, 0.2)",
      "effect.shadow.cta": "0 12px 24px rgba(125, 152, 178, 0.2)",
      "effect.shadow.popout": "0 16px 40px rgba(125, 152, 178, 0.2)",
      "effect.timing.slowest": "0.8s",
      "effect.timing.slow": "0.4s",
      "effect.timing.medium": "0.2s",
      "effect.transition.ease": "ease-in-out",
      "size.pageStickyHeaderMobileHeight": "60px",
      "size.pageStickyHeaderDesktopHeight": "72px",
      "size.pageWidth": "997px",
    };

    if (p1 in tokenValues) {
      return tokenValues[p1];
    }

    return p1;
  });
}
