import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  headerID: string;
  onCreateSelected: (selected: T[]) => void;
}) => {
  const { missingObjects, renderName, headerID, onCreateSelected } = props;

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
          <tr>
            <th>
              <Form.Check
                checked={allChecked ?? false}
                onChange={toggleAllChecked}
                disabled={missingObjects.length === 0}
              />
            </th>
            <th>
              <FormattedMessage id={headerID} />
            </th>
            <th>
              <Button
                size="sm"
                disabled={!checkedItems.length}
                onClick={() => onCreateSelected(checkedItems)}
              >
                Create Selected
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
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
        </tbody>
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

const renderTagName = (t: ScrapedTag) => <span>{t.name}</span>;

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

  const resetLoading = useCallback((n?: number) => {
    setCreateTotal(n);
    setCurrentIndex(undefined);
    setCreating(undefined);
    stopping.current = false;
  }, []);

  const onCreateStudios = useCallback(
    async (selected: ScrapedStudio[]) => {
      const toRemap: CreatedObject<ScrapedStudio>[] = [];

      resetLoading(selected.length);

      for (let i = 0; i < selected.length; i++) {
        const studio = selected[i];
        setCurrentIndex(i);
        setCreating(studio.name ?? "");

        const input = studioCreateInputFromScraped(
          studio,
          endpoint ?? undefined
        );
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
    },
    [createNewStudio, endpoint, postCreateNewStudios, resetLoading]
  );

  const onCreatePerformers = useCallback(
    async (selected: ScrapedPerformer[]) => {
      const toRemap: CreatedObject<ScrapedPerformer>[] = [];

      resetLoading(selected.length);

      for (let i = 0; i < selected.length; i++) {
        const performer = selected[i];
        setCurrentIndex(i);
        setCreating(performer.name ?? "");

        const input = performerCreateInputFromScraped(
          performer,
          0,
          endpoint ?? undefined
        );
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
    },
    [createNewPerformer, endpoint, postCreateNewPerformers, resetLoading]
  );

  const onCreateTags = useCallback(
    async (selected: ScrapedTag[]) => {
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
    },
    [createNewTag, postCreateNewTags, resetLoading]
  );

  const renderPerformerName = useCallback(
    (p: ScrapedPerformer) => (
      <PerformerName
        performer={p}
        id={p.remote_site_id}
        baseURL={stashboxPerformerPrefix}
      />
    ),
    [stashboxPerformerPrefix]
  );

  const renderStudioName = useCallback(
    (s: ScrapedStudio) => (
      <StudioName
        studio={s}
        id={s.remote_site_id}
        baseURL={stashboxStudioPrefix}
      />
    ),
    [stashboxStudioPrefix]
  );

  if (!performers.length && !studios.length && !tags.length) {
    return null;
  }

  return (
    <Collapse in={show} mountOnEnter unmountOnExit>
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
              renderName={renderStudioName}
              headerID="studio"
              onCreateSelected={onCreateStudios}
            />
          </Col>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={performers}
              renderName={renderPerformerName}
              headerID="performer"
              onCreateSelected={onCreatePerformers}
            />
          </Col>
          <Col lg={4} md={6}>
            <MissingObjectsTable
              missingObjects={tags}
              renderName={renderTagName}
              headerID="tag"
              onCreateSelected={onCreateTags}
            />
          </Col>
        </Row>
      </Card>
    </Collapse>
  );
};

export default MissingObjectsPanel;
