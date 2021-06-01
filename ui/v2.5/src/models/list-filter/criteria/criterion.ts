/* eslint-disable consistent-return */

import { IntlShape } from "react-intl";
import {
  CriterionModifier,
  HierarchicalMultiCriterionInput,
  MultiCriterionInput,
} from "src/core/generated-graphql";
import DurationUtils from "src/utils/duration";
import {
  CriterionType,
  encodeILabeledId,
  ILabeledId,
  ILabeledValue,
  IOptionType,
  IHierarchicalLabelValue,
} from "../types";

export type Option = string | number | IOptionType;
export type CriterionValue =
  | string
  | number
  | ILabeledId[]
  | IHierarchicalLabelValue;

// V = criterion value type
export abstract class Criterion<V extends CriterionValue> {
  public static getModifierOption(
    modifier: CriterionModifier = CriterionModifier.Equals
  ): ILabeledValue {
    switch (modifier) {
      case CriterionModifier.Equals:
        return { value: CriterionModifier.Equals, label: "Equals" };
      case CriterionModifier.NotEquals:
        return { value: CriterionModifier.NotEquals, label: "Not Equals" };
      case CriterionModifier.GreaterThan:
        return { value: CriterionModifier.GreaterThan, label: "Greater Than" };
      case CriterionModifier.LessThan:
        return { value: CriterionModifier.LessThan, label: "Less Than" };
      case CriterionModifier.IsNull:
        return { value: CriterionModifier.IsNull, label: "Is NULL" };
      case CriterionModifier.NotNull:
        return { value: CriterionModifier.NotNull, label: "Not NULL" };
      case CriterionModifier.IncludesAll:
        return { value: CriterionModifier.IncludesAll, label: "Includes All" };
      case CriterionModifier.Includes:
        return { value: CriterionModifier.Includes, label: "Includes" };
      case CriterionModifier.Excludes:
        return { value: CriterionModifier.Excludes, label: "Excludes" };
      case CriterionModifier.MatchesRegex:
        return {
          value: CriterionModifier.MatchesRegex,
          label: "Matches Regex",
        };
      case CriterionModifier.NotMatchesRegex:
        return {
          value: CriterionModifier.NotMatchesRegex,
          label: "Not Matches Regex",
        };
    }
  }

  public criterionOption: CriterionOption;
  public modifier: CriterionModifier;
  public value: V;
  public inputType: "number" | "text" | undefined;

  public abstract getLabelValue(): string;

  constructor(type: CriterionOption, value: V) {
    this.criterionOption = type;
    this.modifier = type.defaultModifier;
    this.value = value;
  }

  public getLabel(intl: IntlShape): string {
    let modifierMessageID: string;
    switch (this.modifier) {
      case CriterionModifier.Equals:
        modifierMessageID = "criterion_modifier.equals";
        break;
      case CriterionModifier.NotEquals:
        modifierMessageID = "criterion_modifier.not_equals";
        break;
      case CriterionModifier.GreaterThan:
        modifierMessageID = "criterion_modifier.greater_than";
        break;
      case CriterionModifier.LessThan:
        modifierMessageID = "criterion_modifier.less_than";
        break;
      case CriterionModifier.IsNull:
        modifierMessageID = "criterion_modifier.is_null";
        break;
      case CriterionModifier.NotNull:
        modifierMessageID = "criterion_modifier.not_null";
        break;
      case CriterionModifier.Includes:
        modifierMessageID = "criterion_modifier.includes";
        break;
      case CriterionModifier.IncludesAll:
        modifierMessageID = "criterion_modifier.includes_all";
        break;
      case CriterionModifier.Excludes:
        modifierMessageID = "criterion_modifier.excludes";
        break;
      case CriterionModifier.MatchesRegex:
        modifierMessageID = "criterion_modifier.matches_regex";
        break;
      case CriterionModifier.NotMatchesRegex:
        modifierMessageID = "criterion_modifier.not_matches_regex";
        break;
      default:
        modifierMessageID = "";
    }

    const modifierString = modifierMessageID
      ? intl.formatMessage({ id: modifierMessageID })
      : "";
    let valueString = "";

    if (
      this.modifier !== CriterionModifier.IsNull &&
      this.modifier !== CriterionModifier.NotNull
    ) {
      valueString = this.getLabelValue();
    }

    return `${intl.formatMessage({
      id: this.criterionOption.messageID,
    })} ${modifierString} ${valueString}`;
  }

  public getId(): string {
    return `${this.criterionOption.parameterName}-${this.modifier.toString()}`; // TODO add values?
  }

  public encodeValue(): V {
    return this.value;
  }

  public toJSON() {
    const encodedCriterion = {
      type: this.criterionOption.value,
      // #394 - the presence of a # symbol results in the query URL being
      // malformed. We could set encode: true in the queryString.stringify
      // call below, but this results in a URL that gets pretty long and ugly.
      // Instead, we'll encode the criteria values.
      value: this.encodeValue(),
      modifier: this.modifier,
    };
    return JSON.stringify(encodedCriterion);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public apply(outputFilter: Record<string, any>) {
    // eslint-disable-next-line no-param-reassign
    outputFilter[this.criterionOption.parameterName] = this.toCriterionInput();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected toCriterionInput(): any {
    return {
      value: this.value,
      modifier: this.modifier,
    };
  }
}

interface ICriterionOptionsParams {
  messageID: string;
  value: CriterionType;
  parameterName?: string;
  modifierOptions?: CriterionModifier[];
  defaultModifier?: CriterionModifier;
  options?: Option[];
}
export class CriterionOption {
  public readonly messageID: string;
  public readonly value: CriterionType;
  public readonly parameterName: string;
  public readonly modifierOptions: ILabeledValue[];
  public readonly defaultModifier: CriterionModifier;
  public readonly options: Option[] | undefined;

  constructor(options: ICriterionOptionsParams) {
    this.messageID = options.messageID;
    this.value = options.value;
    this.parameterName = options.parameterName ?? options.value;
    this.modifierOptions = (options.modifierOptions ?? []).map((o) =>
      Criterion.getModifierOption(o)
    );
    this.defaultModifier = options.defaultModifier ?? CriterionModifier.Equals;
    this.options = options.options;
  }
}

export class StringCriterionOption extends CriterionOption {
  constructor(
    messageID: string,
    value: CriterionType,
    parameterName?: string,
    options?: Option[]
  ) {
    super({
      messageID,
      value,
      parameterName,
      modifierOptions: [
        CriterionModifier.Equals,
        CriterionModifier.NotEquals,
        CriterionModifier.Includes,
        CriterionModifier.Excludes,
        CriterionModifier.IsNull,
        CriterionModifier.NotNull,
        CriterionModifier.MatchesRegex,
        CriterionModifier.NotMatchesRegex,
      ],
      defaultModifier: CriterionModifier.Equals,
      options,
    });
  }
}

export function createStringCriterionOption(value: CriterionType) {
  return new StringCriterionOption(value, value, value);
}

export class StringCriterion extends Criterion<string> {
  public getLabelValue() {
    return this.value;
  }

  public encodeValue() {
    // replace certain characters
    let ret = this.value;
    ret = StringCriterion.replaceSpecialCharacter(ret, "&");
    ret = StringCriterion.replaceSpecialCharacter(ret, "+");
    return ret;
  }

  private static replaceSpecialCharacter(str: string, c: string) {
    return str.replaceAll(c, encodeURIComponent(c));
  }

  constructor(type: CriterionOption) {
    super(type, "");

    this.inputType = "text";
  }
}

export class MandatoryStringCriterionOption extends CriterionOption {
  constructor(
    messageID: string,
    value: CriterionType,
    parameterName?: string,
    options?: Option[]
  ) {
    super({
      messageID,
      value,
      parameterName,
      modifierOptions: [
        CriterionModifier.Equals,
        CriterionModifier.NotEquals,
        CriterionModifier.Includes,
        CriterionModifier.Excludes,
        CriterionModifier.MatchesRegex,
        CriterionModifier.NotMatchesRegex,
      ],
      defaultModifier: CriterionModifier.Equals,
      options,
    });
  }
}

export class BooleanCriterionOption extends CriterionOption {
  constructor(messageID: string, value: CriterionType, parameterName?: string) {
    super({
      messageID,
      value,
      parameterName,
      modifierOptions: [],
      defaultModifier: CriterionModifier.Equals,
      options: [true.toString(), false.toString()],
    });
  }
}

export class BooleanCriterion extends StringCriterion {
  protected toCriterionInput(): boolean {
    return this.value === "true";
  }
}

export class NumberCriterionOption extends CriterionOption {
  constructor(
    messageID: string,
    value: CriterionType,
    parameterName?: string,
    options?: Option[]
  ) {
    super({
      messageID,
      value,
      parameterName,
      modifierOptions: [
        CriterionModifier.Equals,
        CriterionModifier.NotEquals,
        CriterionModifier.GreaterThan,
        CriterionModifier.LessThan,
        CriterionModifier.IsNull,
        CriterionModifier.NotNull,
      ],
      defaultModifier: CriterionModifier.Equals,
      options,
    });
  }
}

export function createNumberCriterionOption(value: CriterionType) {
  return new NumberCriterionOption(value, value, value);
}

export class NumberCriterion extends Criterion<number> {
  public getLabelValue() {
    return this.value.toString();
  }

  constructor(type: CriterionOption) {
    super(type, 0);

    this.inputType = "number";
  }
}

export class ILabeledIdCriterionOption extends CriterionOption {
  constructor(
    messageID: string,
    value: CriterionType,
    parameterName: string,
    includeAll: boolean
  ) {
    const modifierOptions = [
      CriterionModifier.Includes,
      CriterionModifier.Excludes,
    ];

    if (includeAll) {
      modifierOptions.unshift(CriterionModifier.IncludesAll);
    }

    super({
      messageID,
      value,
      parameterName,
      modifierOptions,
      defaultModifier: CriterionModifier.IncludesAll,
    });
  }
}

export class ILabeledIdCriterion extends Criterion<ILabeledId[]> {
  public getLabelValue(): string {
    return this.value.map((v) => v.label).join(", ");
  }

  protected toCriterionInput(): MultiCriterionInput {
    return {
      value: this.value.map((v) => v.id),
      modifier: this.modifier,
    };
  }

  public encodeValue() {
    return this.value.map((o) => {
      return encodeILabeledId(o);
    });
  }

  constructor(type: CriterionOption) {
    super(type, []);
  }
}

export class IHierarchicalLabeledIdCriterion extends Criterion<IHierarchicalLabelValue> {
  public encodeValue() {
    return {
      items: this.value.items.map((o) => {
        return encodeILabeledId(o);
      }),
      depth: this.value.depth,
    };
  }

  protected toCriterionInput(): HierarchicalMultiCriterionInput {
    return {
      value: this.value.items.map((v) => v.id),
      modifier: this.modifier,
      depth: this.value.depth,
    };
  }

  public getLabelValue(): string {
    const labels = this.value.items.map((v) => v.label).join(", ");

    if (this.value.depth === 0) {
      return labels;
    }

    return `${labels} (+${this.value.depth > 0 ? this.value.depth : "all"})`;
  }

  constructor(type: CriterionOption) {
    const value: IHierarchicalLabelValue = {
      items: [],
      depth: 0,
    };

    super(type, value);
  }
}

export class MandatoryNumberCriterionOption extends CriterionOption {
  constructor(messageID: string, value: CriterionType, parameterName?: string) {
    super({
      messageID,
      value,
      parameterName,
      modifierOptions: [
        CriterionModifier.Equals,
        CriterionModifier.NotEquals,
        CriterionModifier.GreaterThan,
        CriterionModifier.LessThan,
      ],
      defaultModifier: CriterionModifier.Equals,
    });
  }
}

export function createMandatoryNumberCriterionOption(value: CriterionType) {
  return new MandatoryNumberCriterionOption(value, value, value);
}

export class DurationCriterion extends Criterion<number> {
  constructor(type: CriterionOption) {
    super(type, 0);
  }

  public getLabelValue() {
    return DurationUtils.secondsToString(this.value);
  }
}
