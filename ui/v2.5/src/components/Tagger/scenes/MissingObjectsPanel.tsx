import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Modal,
  ProgressBar,
  Row,
  Table,
} from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { CreatedObject, useTagger } from "../context";
import {
  Maybe,
  ScrapedPerformer,
  ScrapedStudio,
  ScrapedTag,
} from "src/core/generated-graphql";
import { PerformerName } from "./PerformerResult";
import { getStashboxBase } from "src/utils/stashbox";
import { StudioName } from "./StudioResult";
import { Icon } from "src/components/Shared/Icon";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import {
  performerCreateInputFromScraped,
  studioCreateInputFromScraped,
  tagCreateInputFromScraped,
} from "../utils";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";

interface IMissingObject {
  name?: Maybe<string> | undefined;
}

const MissingObjectsTable = <T extends IMissingObject>(props: {
  missingObjects: T[];
  renderName: (obj: T) => React.ReactNode;
  header: React.ReactNode;
  onCreateSelected: (selected: T[]) => void;
}) => {
  const { missingObjects, renderName, header, onCreateSelected } = props;

  const [checkedItems, setCheckedItems] = useState<T[]>([]);
  const allChecked =
    !!missingObjects.length && missingObjects.length === checkedItems.length;

  useEffect(() => {
    setCheckedItems((current) => {
      return current.filter((item) =>
        missingObjects.find((obj) => obj.name === item.name)
      );
    });
  }, [missingObjects]);

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
              disabled={missingObjects.length === 0}
            />
          </th>
          <th>{header}</th>
          <th>
            <Button
              size="sm"
              disabled={!checkedItems.length}
              onClick={() => onCreateSelected(checkedItems)}
            >
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

const LoadingModal: React.FC<{
  total?: number;
  currentIndex?: number;
  currentlyCreating?: string;
  onStop: () => void;
}> = ({ total = 0, currentIndex, currentlyCreating, onStop }) => {
  const [stopping, setStopping] = useState(false);

  if (!total) return null;

  const progress =
    currentIndex !== undefined ? (currentIndex / total) * 100 : undefined;

  return (
    <Modal show className="loading-modal">
      <div className="modal-body">
        <div>
          <LoadingIndicator
            small
            inline
            message={
              <span>
                <FormattedMessage id="component_tagger.creating_missing_objects" />
                …
              </span>
            }
          />
          <ProgressBar animated now={progress} />
          {currentlyCreating && (
            <span>
              <FormattedMessage
                id="component_tagger.creating_object"
                values={{ name: currentlyCreating }}
              />
              …
            </span>
          )}
        </div>
        <div className="btn-toolbar">
          <Button
            variant="danger"
            disabled={stopping}
            onClick={() => {
              setStopping(true);
              onStop();
            }}
          >
            <FormattedMessage id="actions.stop" />
          </Button>
        </div>
      </div>
    </Modal>
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
  const [createTotal, setCreateTotal] = useState<number>();
  const [currentIndex, setCurrentIndex] = useState<number>();
  const [creating, setCreating] = useState<string>();
  const stopping = useRef(false);

  const {
    missingObjects,
    currentSource,
    createNewPerformer,
    postCreateNewPerformers,
    createNewStudio,
    postCreateNewStudios,
    createNewTag,
    postCreateNewTags,
  } = useTagger();

  const { performers, studios, tags } = missingObjects;

  const endpoint = currentSource?.sourceInput.stash_box_endpoint;

  const stashboxBase = endpoint ? getStashboxBase(endpoint) : undefined;

  const stashboxPerformerPrefix = stashboxBase
    ? `${stashboxBase}performers/`
    : undefined;

  const stashboxStudioPrefix = stashboxBase
    ? `${stashboxBase}studios/`
    : undefined;

  function resetLoading(n?: number) {
    setCreateTotal(n);
    setCurrentIndex(undefined);
    setCreating(undefined);
    stopping.current = false;
  }

  async function onCreateStudios(selected: ScrapedStudio[]) {
    const toRemap: CreatedObject<ScrapedStudio>[] = [];

    resetLoading(selected.length);

    for (let i = 0; i < selected.length; i++) {
      const studio = selected[i];
      setCurrentIndex(i);
      setCreating(studio.name ?? "");

      const input = studioCreateInputFromScraped(studio, endpoint);
      const remap = false;
      try {
        const studioID = await createNewStudio(studio, input, remap);
        if (studioID) {
          toRemap.push({ obj: studio, id: studioID });
        }
      } catch (e) {
        // TODO - handle errors
      } finally {
        if (stopping.current) {
          break;
        }
      }
    }

    resetLoading();
    postCreateNewStudios(toRemap);
  }

  async function onCreatePerformers(selected: ScrapedPerformer[]) {
    const toRemap: CreatedObject<ScrapedPerformer>[] = [];

    resetLoading(selected.length);

    for (let i = 0; i < selected.length; i++) {
      const performer = selected[i];
      setCurrentIndex(i);
      setCreating(performer.name ?? "");

      const input = performerCreateInputFromScraped(performer, 0, endpoint);
      const remap = false;
      try {
        const performerID = await createNewPerformer(performer, input, remap);
        if (performerID) {
          toRemap.push({ obj: performer, id: performerID });
        }
      } catch (e) {
        // TODO - handle errors
      } finally {
        if (stopping.current) {
          break;
        }
      }
    }

    resetLoading();
    postCreateNewPerformers(toRemap);
  }

  async function onCreateTags(selected: ScrapedTag[]) {
    const toRemap: CreatedObject<ScrapedTag>[] = [];

    resetLoading(selected.length);

    for (let i = 0; i < selected.length; i++) {
      if (stopping.current) {
        break;
      }

      const tag = selected[i];
      setCurrentIndex(i);
      setCreating(tag.name ?? "");

      const input = tagCreateInputFromScraped(tag); // , endpoint
      const remap = false;
      try {
        const tagID = await createNewTag(tag, input, remap);
        if (tagID) {
          toRemap.push({ obj: tag, id: tagID });
        }
      } catch (e) {
        // TODO - handle errors
      }
    }

    resetLoading();
    postCreateNewTags(toRemap);
  }

  return (
    <Collapse in={show}>
      <Card className="missing-objects-panel">
        <LoadingModal
          total={createTotal}
          currentIndex={currentIndex}
          currentlyCreating={creating}
          onStop={() => (stopping.current = true)}
        />

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
              onCreateSelected={onCreateStudios}
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
              onCreateSelected={onCreatePerformers}
            />
          </Col>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={tags}
              renderName={(t) => <span>{t.name}</span>}
              header={<FormattedMessage id="tag" />}
              onCreateSelected={onCreateTags}
            />
          </Col>
        </Row>
      </Card>
    </Collapse>
  );
};

export default MissingObjectsPanel;
