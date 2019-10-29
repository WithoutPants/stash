import {
  Alert,
  Button,
  Checkbox,
  Divider,
  FormGroup,
  H4,
  AnchorButton,
} from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { StashService } from "../../../core/StashService";
import { ErrorUtils } from "../../../utils/errors";
import { ToastUtils } from "../../../utils/toasts";
import { GenerateButton } from "./GenerateButton";
import { Link } from "react-router-dom";

interface IProps {}

export const SettingsTasksPanel: FunctionComponent<IProps> = (props: IProps) => {
  const [isImportAlertOpen, setIsImportAlertOpen] = useState<boolean>(false);
  const [isCleanAlertOpen, setIsCleanAlertOpen] = useState<boolean>(false);
  const [nameFromMetadata, setNameFromMetadata] = useState<boolean>(true);

  function onImport() {
    setIsImportAlertOpen(false);
    StashService.queryMetadataImport();
  }

  function renderImportAlert() {
    return (
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Import"
        icon="trash"
        intent="danger"
        isOpen={isImportAlertOpen}
        onCancel={() => setIsImportAlertOpen(false)}
        onConfirm={() => onImport()}
      >
        <p>
          Are you sure you want to import?  This will delete the database and re-import from
          your exported metadata.
        </p>
      </Alert>
    );
  }

  function onClean() {
    setIsCleanAlertOpen(false);
    StashService.queryMetadataClean();
  }

  function renderCleanAlert() {
    return (
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Clean"
        icon="trash"
        intent="danger"
        isOpen={isCleanAlertOpen}
        onCancel={() => setIsCleanAlertOpen(false)}
        onConfirm={() => onClean()}
      >
        <p>
          Are you sure you want to Clean?
          This will delete db information and generated content
          for all scenes that are no longer found in the filesystem.
        </p>
      </Alert>
    );
  }

  async function onScan() {
    try {
      await StashService.queryMetadataScan({nameFromMetadata});
      ToastUtils.success("Started scan");
    } catch (e) {
      ErrorUtils.handle(e);
    }
  }

  return (
    <>
      {renderImportAlert()}
      {renderCleanAlert()}

      <H4>Library</H4>
      <FormGroup
        helperText="Scan for new content and add it to the database."
        labelFor="scan"
        inline={true}
      >
        <Checkbox
          checked={nameFromMetadata}
          label="Set name from metadata (if present)"
          onChange={() => setNameFromMetadata(!nameFromMetadata)}
        />
        <Button id="scan" text="Scan" onClick={() => onScan()} />
      </FormGroup>
        <Link className="bp3-button" to={"/sceneFilenameParser"}>
          Scene Filename Parser
        </Link>
      <FormGroup>

      </FormGroup>
      <Divider />

      <H4>Generated Content</H4>
      <GenerateButton />
      <FormGroup
        helperText="Check for missing files and remove them from the database. This is a destructive action."
        labelFor="clean"
        inline={true}
      >
        <Button id="clean" text="Clean" intent="danger" onClick={() => setIsCleanAlertOpen(true)} />
      </FormGroup>
      <Divider />

      <H4>Metadata</H4>
      <FormGroup
        helperText="Export the database content into JSON format"
        labelFor="export"
        inline={true}
      >
        <Button id="export" text="Export" onClick={() => StashService.queryMetadataExport()} />
      </FormGroup>

      <FormGroup
        helperText="Import from exported JSON.  This is a destructive action."
        labelFor="import"
        inline={true}
      >
        <Button id="import" text="Import" intent="danger" onClick={() => setIsImportAlertOpen(true)} />
      </FormGroup>
    </>
  );
};
