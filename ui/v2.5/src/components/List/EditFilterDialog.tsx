import cloneDeep from "lodash-es/cloneDeep";
import React, { useCallback, useMemo, useState } from "react";
import { Button, Col, Container, Form, Modal } from "react-bootstrap";
import {
  Criterion,
  CriterionOption,
  ModifierCriterion,
  ModifierCriterionOption,
} from "src/models/list-filter/criteria/criterion";
import { FormattedMessage, useIntl } from "react-intl";
import { ListFilterModel } from "src/models/list-filter/filter";
import { getFilterOptions } from "src/models/list-filter/factory";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { ModifierSelect } from "./ModifierSelect";
import { CriterionEditor } from "./CriterionEditor";
import { CriterionModifier } from "src/core/generated-graphql";
import { Icon } from "../Shared/Icon";

const FormControl: React.FC<React.ComponentProps<typeof Form.Control>> = (
  props
) => {
  return (
    <Form.Control
      {...props}
      className={`input-control ${props.className ?? ""}`}
    />
  );
};

const CriterionOptionSelect: React.FC<{
  criterionOptions: CriterionOption[];
  pinnedCriterionOptions: CriterionOption[];
  value: CriterionOption | undefined;
  onChange: (option: CriterionOption) => void;
}> = ({ criterionOptions, pinnedCriterionOptions, value, onChange }) => {
  const intl = useIntl();

  const options = useMemo(() => {
    return [
      ...pinnedCriterionOptions,
      ...criterionOptions.filter((c) => !pinnedCriterionOptions.includes(c)),
    ];
  }, [criterionOptions, pinnedCriterionOptions]);

  return (
    <FormControl
      as="select"
      value={value?.type ?? ""}
      onChange={(e) => {
        const option = options.find((c) => c.type === e.target.value);
        if (!option) {
          throw new Error(
            `CriterionOptionSelect: No option found for type ${e.target.value}`
          );
        }
        onChange(option);
      }}
    >
      {/* don't offer unselected if it has a value */}
      {!value && <option value="">{intl.formatMessage({ id: "type" })}</option>}
      {options.map((c) => (
        <option key={c.type} value={c.type}>
          {intl.formatMessage({ id: c.messageID })}
        </option>
      ))}
    </FormControl>
  );
};

const CriterionRow: React.FC<{
  criterion?: Criterion;
  criterionOptions: CriterionOption[];
  onCriterionChanged: (c: Criterion) => void;
  onRemove: () => void;
}> = ({ criterion, criterionOptions, onCriterionChanged, onRemove }) => {
  const criterionOption = criterion?.criterionOption;

  const hasModifier = criterionOption instanceof ModifierCriterionOption;
  const modifierCriterionOption = hasModifier
    ? (criterionOption as ModifierCriterionOption)
    : undefined;

  const isModifierCriterion = criterion instanceof ModifierCriterion;
  const modifierCriterion = isModifierCriterion
    ? (criterion as ModifierCriterion)
    : undefined;

  const showModifier =
    modifierCriterion &&
    modifierCriterionOption &&
    modifierCriterionOption.modifierOptions.length > 1;

  return (
    <Form.Row>
      <Col>
        <Form.Group>
          <div>
            <CriterionOptionSelect
              criterionOptions={criterionOptions}
              pinnedCriterionOptions={[]}
              value={criterionOption}
              onChange={(option) => {
                const newCriterion = option.makeCriterion();
                onCriterionChanged(newCriterion);
              }}
            />
          </div>
        </Form.Group>
      </Col>
      <Form.Group as={Col}>
        {showModifier && modifierCriterionOption && (
          <ModifierSelect
            value={modifierCriterion.modifier}
            onChanged={(modifier) =>
              criterion &&
              onCriterionChanged(modifierCriterion.withModifier(modifier))
            }
            options={
              modifierCriterionOption.modifierOptions ?? [
                CriterionModifier.Equals,
              ]
            }
          />
        )}
      </Form.Group>
      <Form.Group as={Col}>
        {criterion && (
          <CriterionEditor
            criterion={criterion}
            onChange={(c) => onCriterionChanged(c)}
          />
        )}
      </Form.Group>
      <Col xs="auto">
        {criterion !== undefined && (
          <Button
            className="minimal btn-danger-minimal"
            onClick={() => onRemove()}
          >
            <Icon icon={faTimes} />
          </Button>
        )}
      </Col>
    </Form.Row>
  );
};

interface IEditFilterProps {
  filter: ListFilterModel;
  editingCriterion?: string;
  onApply: (filter: ListFilterModel) => void;
  onCancel: () => void;
}

function initCriteria(existing: Criterion[]) {
  if (existing.length === 0) {
    return [undefined];
  }

  return existing;
}

export const EditFilterDialog: React.FC<IEditFilterProps> = ({
  filter,
  onApply,
  onCancel,
}) => {
  const intl = useIntl();

  const filterOptions = useMemo(() => {
    return getFilterOptions(filter.mode);
  }, [filter.mode]);

  const criterionOptions = useMemo(() => {
    return [...filterOptions.criterionOptions]
      .filter((c) => !c.hidden)
      .sort((a, b) => {
        return intl
          .formatMessage({ id: a.messageID })
          .localeCompare(intl.formatMessage({ id: b.messageID }));
      });
  }, [intl, filterOptions.criterionOptions]);

  const [criteria, setCriteria] = useState<(Criterion | undefined)[]>(
    initCriteria(filter.criteria)
  );

  function onRemoveCriterion(idx: number) {
    const newCriteria = [...criteria];
    newCriteria.splice(idx, 1);
    setCriteria(newCriteria);
  }

  function onClearAll() {
    setCriteria([]);
  }

  function onCriterionChanged(idx: number, c: Criterion) {
    const newCriteria = [...criteria];
    newCriteria[idx] = c;
    setCriteria(newCriteria);
  }

  function canAdd() {
    return !criteria.length || criteria[criteria.length - 1] !== undefined;
  }

  function applyClicked() {
    const newFilter = cloneDeep(filter);
    newFilter.criteria = criteria.filter((c) => c !== undefined);

    onApply(newFilter);
  }

  function canApply() {
    const filteredCriteria = criteria.filter((c) => c !== undefined);
    return (
      filteredCriteria.length === 0 ||
      filteredCriteria.every((c) => c.isValid())
    );
  }

  return (
    <>
      <Modal
        show
        onHide={() => onCancel()}
        size="lg"
        className="edit-filter-dialog2"
      >
        <Modal.Header>
          <FormattedMessage id="search_filter.edit_filter" />
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Form>
              {criteria.map((c, i) => (
                <CriterionRow
                  key={i}
                  criterion={c}
                  criterionOptions={criterionOptions}
                  onCriterionChanged={(cc) => onCriterionChanged(i, cc)}
                  onRemove={() => onRemoveCriterion(i)}
                />
              ))}
              <Form.Row>
                <Col>
                  <Button
                    variant="primary"
                    onClick={() => setCriteria([...criteria, undefined])}
                    disabled={!canAdd()}
                  >
                    <FormattedMessage id="actions.add" />
                  </Button>
                </Col>
                <Col xs="auto" className="ml-auto">
                  <Button variant="danger" onClick={() => onClearAll()}>
                    <FormattedMessage id="actions.clear" />
                  </Button>
                </Col>
              </Form.Row>
            </Form>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => onCancel()}>
            <FormattedMessage id="actions.cancel" />
          </Button>
          <Button onClick={() => applyClicked()} disabled={!canApply()}>
            <FormattedMessage id="actions.apply" />
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export function useShowEditFilter(props: {
  filter: ListFilterModel;
  setFilter: (f: ListFilterModel) => void;
  showModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}) {
  const { filter, setFilter, showModal, closeModal } = props;

  const showEditFilter = useCallback(
    (editingCriterion?: string) => {
      function onApplyEditFilter(f: ListFilterModel) {
        closeModal();
        setFilter(f);
      }

      showModal(
        <EditFilterDialog
          filter={filter}
          onApply={onApplyEditFilter}
          onCancel={() => closeModal()}
          editingCriterion={editingCriterion}
        />
      );
    },
    [filter, setFilter, showModal, closeModal]
  );

  return showEditFilter;
}
