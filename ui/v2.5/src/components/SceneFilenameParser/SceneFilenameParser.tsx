/* eslint-disable no-param-reassign, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */

import React, { useEffect, useState, useMemo } from "react";
import { Button, Card, Col, Container, Form, ListGroup, Modal, Row } from "react-bootstrap";
import * as GQL from "src/core/generated-graphql";
import { FolderSelect } from "../Shared/FolderSelect/FolderSelect";
import { ConfigurationContext } from "src/hooks/Config";
import { Pagination } from "../List/Pagination";
import { gql, useMutation } from "@apollo/client";

interface IFile {
  path: string;
  width: number;
  height: number;
}

interface IScene {
  files: IFile[];
}

// cribbed from shelve plugin
function onlyUnique<T>(value: T, index: number, array: T[]) {
  return array.indexOf(value) === index;
}

function getTokens(path: string) {
  // find all tokens in the path
  // tokens are in the form of {token[.name]}
  return (path.match(/{[^}]+}/g) ?? []).filter(onlyUnique);
}

function resolveToken(obj: any, key: string) {
  var keys = key.split('.');
  var leftover = keys.slice(1).join('.');

  if (Array.isArray(obj)) {
      if (obj.length === 0) {
          throw new Error(`Key ${key} resolved to an empty array`);
      }
      return resolveToken(obj[0], key);
  }

  const value = obj[keys[0]];

  if (keys.length === 1) {
      return value;
  }

  if (value === undefined || value === null) {
      throw new Error(`"${keys[0]}" resolved to an undefined or null value`);
  }

  return resolveToken(obj[keys[0]], leftover);
}

function dir(path: string) {
  // TODO - handle windows paths
  return path.split('/').slice(0, -1).join('/');
}

function basename(path: string) {
  // TODO - handle windows paths
  return path.split('/').pop() ?? "";
}

function basenameOnly(path: string) {
  return basename(path).split('.').slice(0, -1).join('.');
}

function ext(path: string) {
  return `.${basename(path).split('.').pop()}`;
}

// from UI
const resolution = (width: number, height: number) => {
  const number = width > height ? height : width;
  if (number >= 6144) {
    return "HUGE";
  }
  if (number >= 3840) {
    return "8K";
  }
  if (number >= 3584) {
    return "7K";
  }
  if (number >= 3000) {
    return "6K";
  }
  if (number >= 2560) {
    return "5K";
  }
  if (number >= 1920) {
    return "4K";
  }
  if (number >= 1440) {
    return "1440p";
  }
  if (number >= 1080) {
    return "1080p";
  }
  if (number >= 720) {
    return "720p";
  }
  if (number >= 540) {
    return "540p";
  }
  if (number >= 480) {
    return "480p";
  }
  if (number >= 360) {
    return "360p";
  }
  if (number >= 240) {
    return "240p";
  }
  if (number >= 144) {
    return "144p";
  }
};

function getNewScenePath(scene: IScene, file: IFile, newPath: string) {
  const newPathOriginal = newPath;

  // TODO - handle windows paths
  var existingPath = scene.files[0].path;
  var bn = basename(existingPath);
  var bnOnly = basenameOnly(existingPath);
  var xt = ext(existingPath);
  newPath = newPath.replaceAll('{basename}', bnOnly);
  newPath = newPath.replaceAll('{basename.ext}', bn);
  newPath = newPath.replaceAll('{ext}', xt);
  newPath = newPath.replaceAll('{dir}', dir(existingPath));

  const r = resolution(file.width, file.height);
  if (!r && newPath.includes('{resolution}')) {
    throw new Error(`Could not resolve resolution for file ${file.path}`);
  }
  newPath = newPath.replaceAll('{resolution}', r ?? "");

  var tokenStrings = getTokens(newPath);
  tokenStrings.forEach((key) => {
      var token = key.substring(1, key.length - 1);
      var value = resolveToken(scene, token);
      if (!value) {
          throw new Error(`Key ${token} resolved to an empty value`);
          // log.Error(`Key ${key} resolved to an empty value for path ${rule.path}`)
          // errored = true;
          // return;
      }
      newPath = newPath.replaceAll(key, value);
  });

  return newPath;
}

type InclusionValue = "any" | "none" | "";

interface IFilter {
  q: string;
  directory: string;
  studio?: InclusionValue;
  tags?: InclusionValue;
  performers?: InclusionValue;
  date?: InclusionValue;
  title?: InclusionValue;
}

const InclusionFilter: React.FC<{
  filter?: InclusionValue;
  onFilterChanged: (filter: InclusionValue) => void;
}> = ({ filter = "", onFilterChanged }) => {
  return (
    <Form.Control
      as="select"
      className="input-control"
      value={filter ?? ""}
      onChange={(e) => {
        const newFilter = e.target.value;
          onFilterChanged(newFilter as InclusionValue);
        }
      }
    >
      <option value="">Unspecified</option>
      <option value="any">Any</option>
      <option value="none">None</option>
    </Form.Control>
  );
}

function inclusionFilterModifier(
  filter: InclusionValue | undefined,
) {
  if (!filter) return undefined;
  if (filter === "any") {
    return GQL.CriterionModifier.NotNull;
  }
  if (filter === "none") {
    return GQL.CriterionModifier.IsNull;
  }
  return undefined;
}

function inclusionFilterToFilter<T>(
  filter: InclusionValue | undefined,
  value: T
) {
  const modifier = inclusionFilterModifier(filter);
  if (!modifier) return undefined;
  return {
    modifier,
    value,
  };
}

const CheatSheet: React.FC<{
}> = () => {
  return (
    <Card className="mb-3">
      <h5>Cheat Sheet</h5>
      <p>
        You can reference most scene fields in the new path using the following format:
      </p>
      <p>
        <code>{`{field}`}</code> - where <code>field</code> is the name of the field you want to reference.
      </p>
      <p>
        Where there are nested fields, you can use dot notation (<code>{`{studio.name}`}</code>).
        For fields that are arrays, the first item will be used.
      </p>
      <p>
        In addition to scene fields, you can use the following tokens in the new path:
      </p>
      <ul>
        <li><code>{`{basename}`}</code> - The base name of the file without extension</li>
        <li><code>{`{basename.ext}`}</code> - The base name of the file with extension</li>
        <li><code>{`{ext}`}</code> - The file extension (e.g., .mp4)</li>
        <li><code>{`{dir}`}</code> - The directory of the file</li>
        <li><code>{`{resolution}`}</code> - The resolution of the file (e.g., 1080p, 4K)</li>
        {/* Add more tokens as needed */}
      </ul>
    </Card>
  );
}

const SingleColFormGroup: React.FC = ({ children }) => (
  <Col>
    <Form.Group>{children}</Form.Group>
  </Col>
);

const SceneFilter: React.FC<{
  filter: IFilter,
  onFilterChanged: (filter: IFilter) => void;
}> = ({ filter, onFilterChanged }) => {
  const { configuration } = React.useContext(ConfigurationContext);
  
  const libraryPaths = configuration?.general.stashes.map((s) => s.path);

  const [localFilter, setLocalFilter] = useState<IFilter>(filter);

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  return (
    <form>
      <Card>
        <Row>
          <SingleColFormGroup>
            <Form.Label>Base path</Form.Label>
            <FolderSelect
              currentDirectory={localFilter.directory}
              onChangeDirectory={(d) => setLocalFilter({ ...localFilter, directory: d })}
              collapsible
              defaultDirectories={libraryPaths}
            />
          </SingleColFormGroup>
        </Row>
        <Row>
          <SingleColFormGroup>
            <Form.Label>Query</Form.Label>
            <Form.Control
              type="text"
              className="input-control"
              placeholder="Query"
              value={localFilter.q}
              onChange={(e) => setLocalFilter({ ...localFilter, q: e.target.value })}
            />
          </SingleColFormGroup>
        </Row>
        <Row>
      <SingleColFormGroup>
          <Form.Label>Studio</Form.Label>
          <InclusionFilter
            filter={localFilter.studio}
            onFilterChanged={(f) => setLocalFilter({ ...localFilter, studio: f })}
          />
      </SingleColFormGroup>
      <SingleColFormGroup>
            <Form.Label>Performers</Form.Label>
            <InclusionFilter
              filter={localFilter.performers}
              onFilterChanged={(f) => setLocalFilter({ ...localFilter, performers: f })}
            />
      </SingleColFormGroup>
      </Row>
      <Row>
      <SingleColFormGroup>
            <Form.Label>Tags</Form.Label>
            <InclusionFilter
              filter={localFilter.tags}
              onFilterChanged={(f) => setLocalFilter({ ...localFilter, tags: f })}
            />
      </SingleColFormGroup>
      <SingleColFormGroup>
            <Form.Label>Date</Form.Label>
            <InclusionFilter
              filter={localFilter.date}
              onFilterChanged={(f) => setLocalFilter({ ...localFilter, date: f })}
            />
      </SingleColFormGroup>
      </Row>
      <Row>
      <SingleColFormGroup>
        <Form.Label>Title</Form.Label>
        <InclusionFilter
          filter={localFilter.title}
          onFilterChanged={(f) => setLocalFilter({ ...localFilter, title: f })}
        />
      </SingleColFormGroup>
      </Row>
      <Row className="mt-2">
        <Col sm="auto">
          <Button
            variant="primary"
            type="submit"
            disabled={localFilter === filter}
            onClick={(e) => {
              e.preventDefault();
              onFilterChanged(localFilter);
            }}
          >
            Query
          </Button>
        </Col>
      </Row>
      </Card>
    </form>
  );
}

const SceneResultHeader: React.FC<{
}> = ( { }) => {
  return (
    <Row className="mb-2 align-content-center">
      <Col xs="auto" className="align-content-center">
        <Form.Check checked={true} />
      </Col>
      <Col xs="auto">
        <Row>
          <Col xs={12}>
            <span className="text-monospace small text-muted">Original path</span>
          </Col>
          <Col xs={12}>
            <span className="text-monospace small">Renamed path</span>
          </Col>
        </Row>
      </Col>
      <Col xs="auto" className="ml-auto align-content-center">
        <Button
          variant="primary"
          size="sm"
          disabled={true}
        >
          Apply Selected
        </Button>
      </Col>
    </Row>
  );
};

const SceneResult: React.FC<{
  originalPath: string;
  newPath: string;
  error?: unknown;
  onEdit?: () => void;
  onApply?: () => void;
}> = ( { originalPath, newPath, error, onEdit, onApply }) => {
  const isSame = newPath && newPath === originalPath;
  const defaultChecked = !!newPath && newPath !== originalPath;
  const disabled = !newPath || newPath === originalPath;
  const newPathClassName = `text-monospace small ${isSame ? "text-success" : ""}`;

  return (
    <Row className="mb-2 align-content-center">
      <Col xs="auto" className="align-content-center">
        <Form.Check checked={defaultChecked} disabled={disabled} />
      </Col>
      <Col xs="auto">
        <Row>
          <Col xs={12}>
            <span className="text-monospace small text-muted">{originalPath}</span>
          </Col>
          <Col xs={12}>
            {error && <span className="text-danger small">{error.toString()}</span>}
            {newPath && <span className={newPathClassName}>{newPath}</span>}
          </Col>
        </Row>
      </Col>
      <Col xs="auto" className="ml-auto align-content-center">
        <Button
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={onApply}
        >
          Apply
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!newPath}
          onClick={onEdit}
        >
          Edit
        </Button>
      </Col>
    </Row>
  );
}

const ConfirmDialog: React.FC<{
  show: boolean;
  existingPath: string;
  newPath: string;
  onClose: (confirm?: boolean, dontShowAgain?: boolean) => void;
}> = ({ show, onClose, existingPath, newPath }) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  return (
    <Modal show={show} onHide={() => onClose(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rename file</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Renaming:</p>
        <p><code>{existingPath}</code></p>
        <p>To:</p>
        <p><code>{newPath}</code></p>
        <Form.Check 
          type="checkbox"
          id="dont-show-again"
          label="Don't show this dialog again"
          onChange={(e) => setDontShowAgain(e.target.checked)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onClose(true, dontShowAgain)}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

const EditDialog: React.FC<{
  show: boolean;
  existingPath: string;
  defaultNewPath: string;
  onClose: (newPath?: string) => void;
}> = ({ show, onClose, existingPath, defaultNewPath }) => {
  const [newPath, setNewPath] = useState(defaultNewPath);

  useEffect(() => {
    setNewPath(defaultNewPath);
  }, [defaultNewPath]);

  return (
    <Modal show={show} onHide={() => onClose()} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rename file</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Renaming:</p>
        <p><code>{existingPath}</code></p>
        
        <Form.Label>To:</Form.Label>
        <Form.Control
          className="text-monospace"
          size="sm"
          type="textarea"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onClose(newPath)}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

const initialFilter = {
  q: "",
  directory: "",
}

const pageSize = 20;
const defaultNewPath = "{dir}/{basename.ext}";

export const SceneFilenameParser: React.FC = () => {
  const [skip, setSkip] = useState<boolean>(false);
  const [filter, setFilter] = useState<IFilter>(initialFilter);
  const [newPath, setNewPath] = useState(defaultNewPath);
  const [page, setPage] = useState<number>(1);
  const [apply, setApply] = useState<typeof sceneResults[0]>();
  const [edit, setEdit] = useState<typeof sceneResults[0]>();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [runningOperation, setRunningOperation] = useState(false);

  const { data, loading, error, refetch } = GQL.useFindScenesQuery({
    skip,
    variables: {
      filter: {
        q: filter.q,
        sort: "id",
        direction: GQL.SortDirectionEnum.Asc,
        page: page,
        per_page: pageSize,
      },
      scene_filter: {
        path: filter.directory ? {
          modifier: GQL.CriterionModifier.Includes,
          value: filter.directory,
        } : undefined,
        studios: inclusionFilterToFilter(filter.studio, []),
        tags: inclusionFilterToFilter(filter.tags, []),
        performers: inclusionFilterToFilter(filter.performers, []),
        date: inclusionFilterToFilter(filter.date, ""),
        title: inclusionFilterToFilter(filter.title, ""),
      }
    },

  });

  const [mutateMoveFile] = useMutation(gql`
    mutation MoveFile($fileID: ID!, $newBase: String!, $newFolder: String!) {
      moveFiles(input: { 
        ids: [$fileID], 
        destination_basename: $newBase, 
        destination_folder: $newFolder
      })
    }`);

  const count = data?.findScenes?.count ?? 0;

  const sceneResults = useMemo(() => {
    if (!data) return [];

    return data.findScenes.scenes.filter(s => s.files.length > 0).map((scene) => {
      const file = scene.files.find((f) => f.path.toLowerCase().startsWith(filter.directory.toLowerCase()));

      if (!file) return { scene, file, newPath: "" };

      try {
        const newScenePath = getNewScenePath(scene, file, newPath);
        return { scene, file, newPath: newScenePath };
      }
      catch (err) {
        return { scene, file, newPath: "", error: err };
      }
    });
  }, [data?.findScenes.scenes, newPath]);

  function onQuery(f: IFilter) {
    setPage(1);
    setFilter(f);
    setSkip(false);
  }

  function moveFile(fileID: string, newPath: string) {
    setRunningOperation(true);
    mutateMoveFile({ variables: {
        fileID,
        newBase: basename(newPath),
        newFolder: dir(newPath),
    }}).then(() => {
      setApply(undefined);
      setEdit(undefined);
      refetch();
    }).catch((err) => {
      console.error("Error moving file:", err);
    }).finally(() => {
      setRunningOperation(false);
    });
  }

  if (error) { return <div>Error: {error.message}</div>; }
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container className="plugin-shelve-page">
      <ConfirmDialog
        show={!!apply}
        existingPath={apply?.file!.path ?? ""}
        newPath={apply?.newPath ?? ""}
        onClose={(confirm, dontShow) => { 
          if (!confirm) return;  
          if (dontShow) setDontShowAgain(true);
          moveFile(apply?.file!.id ?? "", apply?.newPath ?? "");
        }}
      />
      <EditDialog
        show={!!edit}
        existingPath={edit?.file!.path ?? ""}
        defaultNewPath={edit?.newPath ?? ""}
        onClose={(newPath) => {
          if (!newPath) { setEdit(undefined); return; }
          moveFile(edit?.file!.id ?? "", newPath);
        }}
      />

      <Row>
        <h3>
          Shelve - scene filename renamer
        </h3>
      </Row>
      <SceneFilter
        filter={filter}
        onFilterChanged={(f) => onQuery(f)}
      />

      <CheatSheet />
      
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>New Path</Form.Label>
            <Form.Control
              type="text"
              className="input-control"
              placeholder="New Path"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      <ListGroup className="bg-secondary mb-3">
        <ListGroup.Item className="bg-secondary">
          <SceneResultHeader />
        </ListGroup.Item>

        {sceneResults.filter(r => !!r.file).map((r) => (
          <ListGroup.Item key={r.scene.id} className="mb-2 bg-secondary">
            <SceneResult
              originalPath={r.file.path}
              newPath={r.newPath}
              error={r.error}
              onApply={() => {
                if (dontShowAgain) {
                  moveFile(r.file.id, r.newPath);
                }
                setApply(r);
              }}
              onEdit={() => {
                setEdit(r);
              }}
            />
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Pagination
        currentPage={page}
        itemsPerPage={pageSize}
        totalItems={count}
        onChangePage={(page) => setPage(page)}
      />
    </Container>
  )
};

export default SceneFilenameParser;
