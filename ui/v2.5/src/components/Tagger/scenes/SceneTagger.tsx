import React, { useCallback, useMemo, useState } from "react";
import * as GQL from "src/core/generated-graphql";
import { SceneQueue } from "src/models/sceneQueue";
import { Button, Form } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";

import { Icon } from "src/components/Shared/Icon";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { OperationButton } from "src/components/Shared/OperationButton";
import {
  ISceneQueryResult,
  TaggerSelectContext,
  useTagger,
  useTaggerSelect,
} from "../context";
import Config from "./Config";
import { TaggerScene } from "./TaggerScene";
import { SceneTaggerModals } from "./sceneTaggerModals";
import { SceneSearchResults } from "./StashSearchResult";
import { ConfigurationContext } from "src/hooks/Config";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { useLightbox } from "src/hooks/Lightbox/hooks";
import MissingObjectsPanel from "./MissingObjectsPanel";

const Scene: React.FC<{
  scene: GQL.SlimSceneDataFragment;
  searchResult?: ISceneQueryResult;
  queue?: SceneQueue;
  index: number;
  showLightboxImage: (imagePath: string) => void;
}> = ({ scene, searchResult, queue, index, showLightboxImage }) => {
  const intl = useIntl();
  const { currentSource, doSceneQuery, doSceneFragmentScrape, loading } =
    useTagger();

  const { selectResult, selectedResults } = useTaggerSelect();

  const { configuration } = React.useContext(ConfigurationContext);

  const cont = configuration?.interface.continuePlaylistDefault ?? false;

  const sceneLink = useMemo(
    () =>
      queue
        ? queue.makeLink(scene.id, { sceneIndex: index, continue: cont })
        : `/scenes/${scene.id}`,
    [queue, scene.id, index, cont]
  );

  const errorMessage = useMemo(() => {
    if (searchResult?.error) {
      return searchResult.error;
    } else if (searchResult && searchResult.results?.length === 0) {
      return intl.formatMessage({
        id: "component_tagger.results.match_failed_no_result",
      });
    }
  }, [intl, searchResult]);

  const sceneQuery = useMemo(
    () =>
      currentSource?.supportSceneQuery
        ? async (v: string) => {
            await doSceneQuery(scene, v);
          }
        : undefined,
    [currentSource?.supportSceneQuery, doSceneQuery, scene]
  );

  const scrapeSceneFragment = useMemo(
    () =>
      currentSource?.supportSceneFragment
        ? async () => {
            await doSceneFragmentScrape(scene);
          }
        : undefined,
    [currentSource?.supportSceneFragment, doSceneFragmentScrape, scene]
  );

  const selected = selectedResults[scene.id];

  const setSelected = useCallback(
    (i: number) => {
      selectResult(scene.id, i);
    },
    [scene.id, selectResult]
  );

  const searchResults = useMemo(() => {
    if (searchResult && searchResult.results?.length) {
      return (
        <SceneSearchResults
          scenes={searchResult.results}
          target={scene}
          selected={selected}
          setSelected={setSelected}
        />
      );
    }
  }, [searchResult, selected, scene, setSelected]);

  return (
    <TaggerScene
      loading={loading}
      scene={scene}
      url={sceneLink}
      errorMessage={errorMessage}
      doSceneQuery={sceneQuery}
      scrapeSceneFragment={scrapeSceneFragment}
      showLightboxImage={showLightboxImage}
    >
      {searchResults}
    </TaggerScene>
  );
};

interface ITaggerProps {
  scenes: GQL.SlimSceneDataFragment[];
  queue?: SceneQueue;
}

export const Tagger: React.FC<ITaggerProps> = ({ scenes, queue }) => {
  const {
    sources,
    setCurrentSource,
    currentSource,
    doMultiSceneFragmentScrape,
    stopMultiScrape,
    searchResults,
    loading,
    loadingMulti,
    multiError,
    submitFingerprints,
    pendingFingerprints,
  } = useTagger();
  const [showConfig, setShowConfig] = useState(false);
  const [showMissingObjects, setShowMissingObjects] = useState(false);
  const [hideUnmatched, setHideUnmatched] = useState(false);

  const intl = useIntl();

  function handleSourceSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    setCurrentSource(sources!.find((s) => s.id === e.currentTarget.value));
  }

  function renderSourceSelector() {
    return (
      <Form.Group controlId="scraper">
        <Form.Label>
          <FormattedMessage id="component_tagger.config.source" />
        </Form.Label>
        <div>
          <Form.Control
            as="select"
            value={currentSource?.id}
            className="input-control"
            disabled={loading || !sources.length}
            onChange={handleSourceSelect}
          >
            {!sources.length && <option>No scraper sources</option>}
            {sources.map((i) => (
              <option value={i.id} key={i.id}>
                {i.displayName}
              </option>
            ))}
          </Form.Control>
        </div>
      </Form.Group>
    );
  }

  function renderConfigButton() {
    return (
      <div className="ml-2">
        <Button onClick={() => setShowConfig(!showConfig)}>
          <Icon className="fa-fw" icon={faCog} />
        </Button>
      </div>
    );
  }

  const [spriteImage, setSpriteImage] = useState<string | null>(null);
  const lightboxImage = useMemo(
    () => [{ paths: { thumbnail: spriteImage, image: spriteImage } }],
    [spriteImage]
  );
  const showLightbox = useLightbox({
    images: lightboxImage,
  });

  const showLightboxImage = useCallback(
    (imagePath: string) => {
      setSpriteImage(imagePath);
      showLightbox();
    },
    [showLightbox]
  );

  const filteredScenes = useMemo(
    () =>
      !hideUnmatched
        ? scenes
        : scenes.filter((s) => searchResults[s.id]?.results?.length),
    [scenes, searchResults, hideUnmatched]
  );

  const toggleHideUnmatchedScenes = () => {
    setHideUnmatched(!hideUnmatched);
  };

  function maybeRenderShowHideUnmatchedButton() {
    if (Object.keys(searchResults).length) {
      return (
        <Button onClick={toggleHideUnmatchedScenes}>
          <FormattedMessage
            id="component_tagger.verb_toggle_unmatched"
            values={{
              toggle: (
                <FormattedMessage
                  id={`actions.${!hideUnmatched ? "hide" : "show"}`}
                />
              ),
            }}
          />
        </Button>
      );
    }
  }

  function MissingObjectsButton() {
    const { missingObjects } = useTaggerSelect();
    const { performers, studios, tags } = missingObjects;
    if (!performers.length && !studios.length && !tags.length) {
      return null;
    }

    return (
      <Button
        className="ml-1"
        onClick={() => setShowMissingObjects(!showMissingObjects)}
      >
        <FormattedMessage id="component_tagger.verb_create_missing" />
      </Button>
    );
  }

  function maybeRenderSubmitFingerprintsButton() {
    if (pendingFingerprints.length) {
      return (
        <OperationButton
          className="ml-1"
          operation={submitFingerprints}
          disabled={loading || loadingMulti}
        >
          <span>
            <FormattedMessage
              id="component_tagger.verb_submit_fp"
              values={{ fpCount: pendingFingerprints.length }}
            />
          </span>
        </OperationButton>
      );
    }
  }

  function renderFragmentScrapeButton() {
    if (!currentSource?.supportSceneFragment) {
      return;
    }

    if (loadingMulti) {
      return (
        <Button
          className="ml-1"
          variant="danger"
          onClick={() => {
            stopMultiScrape();
          }}
        >
          <LoadingIndicator message="" inline small />
          <span className="ml-2">
            {intl.formatMessage({ id: "actions.stop" })}
          </span>
        </Button>
      );
    }

    return (
      <div className="ml-1">
        <OperationButton
          disabled={loading}
          operation={async () => {
            await doMultiSceneFragmentScrape(scenes);
          }}
        >
          {intl.formatMessage({ id: "component_tagger.verb_scrape_all" })}
        </OperationButton>
        {multiError && (
          <>
            <br />
            <b className="text-danger">{multiError}</b>
          </>
        )}
      </div>
    );
  }

  const hideMissingObjectsPanel = useCallback(
    () => setShowMissingObjects(false),
    []
  );

  return (
    <TaggerSelectContext scenes={scenes}>
      <SceneTaggerModals>
        <div className="tagger-container mx-md-auto">
          <div className="tagger-container-header">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="w-auto">{renderSourceSelector()}</div>
              <div className="d-flex">
                {maybeRenderShowHideUnmatchedButton()}
                <MissingObjectsButton />
                {maybeRenderSubmitFingerprintsButton()}
                {renderFragmentScrapeButton()}
                {renderConfigButton()}
              </div>
            </div>
            <Config show={showConfig} />
            <MissingObjectsPanel
              show={showMissingObjects}
              onHide={hideMissingObjectsPanel}
            />
          </div>
          <div>
            {filteredScenes.map((s, i) => (
              <Scene
                key={s.id}
                scene={s}
                searchResult={searchResults[s.id]}
                index={i}
                showLightboxImage={showLightboxImage}
                queue={queue}
              />
            ))}
          </div>
        </div>
      </SceneTaggerModals>
    </TaggerSelectContext>
  );
};
