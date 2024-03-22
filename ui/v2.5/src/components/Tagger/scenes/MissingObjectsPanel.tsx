import React, { useState } from "react";
import { Button, Card, Col, Collapse, Form, Row, Table } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { useTagger } from "../context";
import { Maybe } from "src/core/generated-graphql";
import { PerformerName } from "./PerformerResult";
import { getStashboxBase } from "src/utils/stashbox";
import { StudioName } from "./StudioResult";
import { Icon } from "src/components/Shared/Icon";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

interface IMissingObject {
  name?: Maybe<string> | undefined;
}

const MissingObjectsTable = <T extends IMissingObject>(props: {
  missingObjects: T[];
  renderName: (obj: T) => React.ReactNode;
  header: React.ReactNode;
}) => {
  const { missingObjects, renderName, header } = props;

  const [checkedItems, setCheckedItems] = useState<T[]>([]);
  const allChecked = missingObjects.length === checkedItems.length;

  function toggleAllChecked() {
    if (allChecked) {
      setCheckedItems([]);
    } else {
      setCheckedItems(missingObjects.slice());
    }
  }

  function toggleCheckedItem(v: T) {
    if (checkedItems.find((item) => item.name === v.name)) {
      setCheckedItems(checkedItems.filter((item) => item.name !== v.name));
    } else {
      setCheckedItems([...checkedItems, v]);
    }
  }

  return (
    <div className="missing-objects-table">
      <Table striped>
        <thead>
          <th>
            <Form.Check
              checked={allChecked ?? false}
              onChange={toggleAllChecked}
              // disabled={loading && packages.length > 0}
            />
          </th>
          <th>{header}</th>
          <th>
            <Button size="sm" disabled={!checkedItems.length}>
              Create Selected
            </Button>
          </th>
        </thead>
        {missingObjects.map((obj) => {
          return (
            <tr key={obj.name}>
              <td>
                <Form.Check
                  checked={checkedItems.includes(obj)}
                  onChange={() => toggleCheckedItem(obj)}
                  // disabled={loading && packages.length > 0}
                />
              </td>
              <td colSpan={2}>{renderName(obj)}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
};

interface IMissingObjectsPanelProps {
  show: boolean;
  onHide: () => void;
}

const MissingObjectsPanel: React.FC<IMissingObjectsPanelProps> = ({
  show,
  onHide,
}) => {
  const { missingObjects, currentSource } = useTagger();

  const { performers, studios, tags } = missingObjects;

  const endpoint = currentSource?.sourceInput.stash_box_endpoint;

  const stashboxBase = endpoint ? getStashboxBase(endpoint) : undefined;

  const stashboxPerformerPrefix = stashboxBase
    ? `${stashboxBase}performers/`
    : undefined;

  const stashboxStudioPrefix = stashboxBase
    ? `${stashboxBase}studios/`
    : undefined;

  return (
    <Collapse in={show}>
      <Card className="missing-objects-panel">
        <div className="missing-objects-panel-header">
          <h4>
            <FormattedMessage id="component_tagger.verb_create_missing" />
          </h4>
          <Button variant="minimal" onClick={() => onHide()}>
            <Icon className="text-danger" icon={faTimes} />
          </Button>
        </div>

        <Row>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={studios}
              renderName={(s) => (
                <StudioName
                  studio={s}
                  id={s.remote_site_id}
                  baseURL={stashboxStudioPrefix}
                />
              )}
              header={<FormattedMessage id="studio" />}
            />
          </Col>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={performers}
              renderName={(p) => (
                <PerformerName
                  performer={p}
                  id={p.remote_site_id}
                  baseURL={stashboxPerformerPrefix}
                />
              )}
              header={<FormattedMessage id="performer" />}
            />
          </Col>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={tags}
              renderName={(t) => <span>{t.name}</span>}
              header={<FormattedMessage id="tag" />}
            />
          </Col>
        </Row>
      </Card>
    </Collapse>
  );
};

export default MissingObjectsPanel;
