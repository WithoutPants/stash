import { Form, Col, Row, Button } from "react-bootstrap";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as GQL from "src/core/generated-graphql";
import {
  GallerySelect,
  Icon,
  Modal,
  SceneSelect,
  StringListSelect,
} from "src/components/Shared";
import { FormUtils } from "src/utils";
import { mutateSceneMerge, queryFindScenesByID } from "src/core/StashService";
import { useIntl } from "react-intl";
import { useToast } from "src/hooks";
import { faExchangeAlt, faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import {
  ScrapeDialog,
  ScrapeDialogRow,
  ScrapedInputGroupRow,
  ScrapedTextAreaRow,
  ScrapeResult,
} from "../Shared/ScrapeDialog";
import { clone, uniq } from "lodash-es";
import {
  ScrapedMoviesRow,
  ScrapedPerformersRow,
  ScrapedStudioRow,
  ScrapedTagsRow,
} from "./SceneDetails/SceneScrapeDialog";
import { galleryTitle } from "src/core/galleries";
import { RatingStars } from "./SceneDetails/RatingStars";

interface IStashIDsField {
  values: GQL.StashId[];
}

const StashIDsField: React.FC<IStashIDsField> = ({ values }) => {
  return <StringListSelect value={values.map((v) => v.stash_id)} />;
};

interface ISceneMergeDetailsProps {
  sources: GQL.SlimSceneDataFragment[];
  dest: GQL.SlimSceneDataFragment;
  onClose: (values?: GQL.SceneUpdateInput) => void;
}

const SceneMergeDetails: React.FC<ISceneMergeDetailsProps> = ({
  sources,
  dest,
  onClose,
}) => {
  const intl = useIntl();

  const [title, setTitle] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(dest.title)
  );
  const [url, setURL] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(dest.url)
  );
  const [date, setDate] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(dest.date)
  );

  const [rating, setRating] = useState(new ScrapeResult<number>(dest.rating));
  const [studio, setStudio] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(dest.studio?.id)
  );

  function sortIdList(idList?: string[] | null) {
    if (!idList) {
      return;
    }

    const ret = clone(idList);
    // sort by id numerically
    ret.sort((a, b) => {
      return parseInt(a, 10) - parseInt(b, 10);
    });

    return ret;
  }

  const [performers, setPerformers] = useState<ScrapeResult<string[]>>(
    new ScrapeResult<string[]>(sortIdList(dest.performers.map((p) => p.id)))
  );

  const [movies, setMovies] = useState<ScrapeResult<string[]>>(
    new ScrapeResult<string[]>(sortIdList(dest.movies.map((p) => p.movie.id)))
  );

  const [tags, setTags] = useState<ScrapeResult<string[]>>(
    new ScrapeResult<string[]>(sortIdList(dest.tags.map((t) => t.id)))
  );

  const [details, setDetails] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(dest.details)
  );

  const [galleries, setGalleries] = useState<ScrapeResult<string[]>>(
    new ScrapeResult<string[]>(sortIdList(dest.galleries.map((p) => p.id)))
  );

  const [stashIDs, setStashIDs] = useState(new ScrapeResult<GQL.StashId[]>([]));

  // calculate the values for everything
  // uses the first set value for single value fields, and combines all
  useEffect(() => {
    const all = [dest, ...sources];

    setTitle(
      new ScrapeResult(
        dest.title,
        sources.find((s) => s.title)?.title,
        !dest.title
      )
    );
    setURL(
      new ScrapeResult(dest.url, sources.find((s) => s.url)?.url, !dest.url)
    );
    setDate(
      new ScrapeResult(dest.date, sources.find((s) => s.date)?.date, !dest.date)
    );
    setStudio(
      new ScrapeResult(
        dest.studio?.id,
        sources.find((s) => s.studio)?.studio?.id,
        !dest.studio
      )
    );

    setPerformers(
      new ScrapeResult(
        dest.performers.map((p) => p.id),
        uniq(all.map((s) => s.performers.map((p) => p.id)).flat())
      )
    );
    setTags(
      new ScrapeResult(
        dest.tags.map((p) => p.id),
        uniq(all.map((s) => s.tags.map((p) => p.id)).flat())
      )
    );
    setDetails(
      new ScrapeResult(
        dest.details,
        sources.find((s) => s.details)?.details,
        !dest.details
      )
    );

    setMovies(
      new ScrapeResult(
        dest.movies.map((m) => m.movie.id),
        uniq(all.map((s) => s.movies.map((m) => m.movie.id)).flat())
      )
    );

    setGalleries(
      new ScrapeResult(
        dest.galleries.map((p) => p.id),
        uniq(all.map((s) => s.galleries.map((p) => p.id)).flat())
      )
    );

    setRating(
      new ScrapeResult(
        dest.rating,
        sources.find((s) => s.rating)?.rating,
        !dest.rating
      )
    );

    setStashIDs(
      new ScrapeResult(
        dest.stash_ids,
        all
          .map((s) => s.stash_ids)
          .flat()
          .filter((s, index, a) => {
            // remove duplicates
            return (
              index ===
              a.findIndex(
                (ss) => ss.endpoint === s.endpoint && ss.stash_id === s.stash_id
              )
            );
          })
      )
    );
  }, [sources, dest]);

  const convertGalleries = useCallback(
    (ids?: string[]) => {
      const all = [dest, ...sources];
      return ids
        ?.map((g) =>
          all
            .map((s) => s.galleries)
            .flat()
            .find((gg) => g === gg.id)
        )
        .map((g) => {
          return {
            id: g!.id,
            title: galleryTitle(g!),
          };
        });
    },
    [dest, sources]
  );

  const originalGalleries = useMemo(() => {
    return convertGalleries(galleries.originalValue);
  }, [galleries, convertGalleries]);

  const newGalleries = useMemo(() => {
    return convertGalleries(galleries.newValue);
  }, [galleries, convertGalleries]);

  function renderScrapeRows() {
    return (
      <>
        <ScrapedInputGroupRow
          title={intl.formatMessage({ id: "title" })}
          result={title}
          onChange={(value) => setTitle(value)}
        />
        <ScrapedInputGroupRow
          title={intl.formatMessage({ id: "url" })}
          result={url}
          onChange={(value) => setURL(value)}
        />
        <ScrapedInputGroupRow
          title={intl.formatMessage({ id: "date" })}
          placeholder="YYYY-MM-DD"
          result={date}
          onChange={(value) => setDate(value)}
        />
        <ScrapeDialogRow
          title={intl.formatMessage({ id: "rating" })}
          result={rating}
          renderOriginalField={() => (
            <RatingStars value={rating.originalValue} disabled />
          )}
          renderNewField={() => (
            <RatingStars value={rating.newValue} disabled />
          )}
          onChange={(value) => setRating(value)}
        />
        <ScrapeDialogRow
          title={intl.formatMessage({ id: "galleries" })}
          result={galleries}
          renderOriginalField={() => (
            <GallerySelect
              className="form-control react-select"
              selected={originalGalleries ?? []}
              onSelect={() => {}}
              disabled
            />
          )}
          renderNewField={() => (
            <GallerySelect
              className="form-control react-select"
              selected={newGalleries ?? []}
              onSelect={() => {}}
              disabled
            />
          )}
          onChange={(value) => setGalleries(value)}
        />
        <ScrapedStudioRow
          title={intl.formatMessage({ id: "studios" })}
          result={studio}
          onChange={(value) => setStudio(value)}
        />
        <ScrapedPerformersRow
          title={intl.formatMessage({ id: "performers" })}
          result={performers}
          onChange={(value) => setPerformers(value)}
        />
        <ScrapedMoviesRow
          title={intl.formatMessage({ id: "movies" })}
          result={movies}
          onChange={(value) => setMovies(value)}
        />
        <ScrapedTagsRow
          title={intl.formatMessage({ id: "tags" })}
          result={tags}
          onChange={(value) => setTags(value)}
        />
        <ScrapedTextAreaRow
          title={intl.formatMessage({ id: "details" })}
          result={details}
          onChange={(value) => setDetails(value)}
        />
        <ScrapeDialogRow
          title={intl.formatMessage({ id: "stash_id" })}
          result={stashIDs}
          renderOriginalField={() => (
            <StashIDsField values={stashIDs?.originalValue ?? []} />
          )}
          renderNewField={() => (
            <StashIDsField values={stashIDs?.newValue ?? []} />
          )}
          onChange={(value) => setStashIDs(value)}
        />
      </>
    );
  }

  function createValues(): GQL.SceneUpdateInput {
    const all = [dest, ...sources];

    return {
      id: dest.id,
      title: title.getNewValue(),
      url: url.getNewValue(),
      date: date.getNewValue(),
      rating: rating.getNewValue(),
      gallery_ids: galleries.getNewValue(),
      studio_id: studio.getNewValue(),
      performer_ids: performers.getNewValue(),
      movies: movies.getNewValue()?.map((m) => {
        // find the equivalent movie in the original scenes
        const found = all
          .map((s) => s.movies)
          .flat()
          .find((mm) => mm.movie.id === m);
        return {
          movie_id: m,
          scene_index: found!.scene_index,
        };
      }),
      tag_ids: tags.getNewValue(),
      details: details.getNewValue(),
      stash_ids: stashIDs.getNewValue(),
    };
  }

  const dialogTitle = intl.formatMessage({
    id: "actions.merge",
  });

  return (
    <ScrapeDialog
      title={dialogTitle}
      existingLabel={intl.formatMessage({ id: "dialogs.merge.destination" })}
      scrapedLabel={intl.formatMessage({ id: "dialogs.merge.source" })}
      renderScrapeRows={renderScrapeRows}
      onClose={(apply) => {
        if (!apply) {
          onClose();
        } else {
          onClose(createValues());
        }
      }}
    />
  );
};

interface ISceneMergeModalProps {
  show: boolean;
  onClose: (mergedID?: string) => void;
  scenes: { id: string; title: string }[];
}

export const SceneMergeModal: React.FC<ISceneMergeModalProps> = ({
  show,
  onClose,
  scenes,
}) => {
  const [sourceScenes, setSourceScenes] = useState<
    { id: string; title: string }[]
  >([]);
  const [destScene, setDestScene] = useState<{ id: string; title: string }[]>(
    []
  );

  const [loadedSources, setLoadedSources] = useState<
    GQL.SlimSceneDataFragment[]
  >([]);
  const [loadedDest, setLoadedDest] = useState<GQL.SlimSceneDataFragment>();

  const [running, setRunning] = useState(false);
  const [secondStep, setSecondStep] = useState(false);

  const intl = useIntl();
  const Toast = useToast();

  const title = intl.formatMessage({
    id: "actions.merge",
  });

  useEffect(() => {
    if (scenes.length > 0) {
      // set the first scene as the destination, others as source
      setDestScene([scenes[0]]);

      if (scenes.length > 1) {
        setSourceScenes(scenes.slice(1));
      }
    }
  }, [scenes]);

  async function loadScenes() {
    const sceneIDs = sourceScenes.map((s) => parseInt(s.id));
    sceneIDs.push(parseInt(destScene[0].id));
    const query = await queryFindScenesByID(sceneIDs);
    const { scenes: loadedScenes } = query.data.findScenes;

    setLoadedDest(loadedScenes.find((s) => s.id === destScene[0].id));
    setLoadedSources(loadedScenes.filter((s) => s.id !== destScene[0].id));
    setSecondStep(true);
  }

  async function onMerge(values: GQL.SceneUpdateInput) {
    try {
      setRunning(true);
      const result = await mutateSceneMerge(
        destScene[0].id,
        sourceScenes.map((s) => s.id),
        values
      );
      if (result.data?.sceneMerge) {
        Toast.success({
          content: intl.formatMessage({ id: "toast.merged_scenes" }),
        });
        // refetch the scene
        await queryFindScenesByID([parseInt(destScene[0].id)]);
        onClose(destScene[0].id);
      }
      onClose();
    } catch (e) {
      Toast.error(e);
    } finally {
      setRunning(false);
    }
  }

  function canMerge() {
    return sourceScenes.length > 0 && destScene.length !== 0;
  }

  function switchScenes() {
    if (sourceScenes.length && destScene.length) {
      const newDest = sourceScenes[0];
      setSourceScenes([...sourceScenes.slice(1), destScene[0]]);
      setDestScene([newDest]);
    }
  }

  if (secondStep && destScene.length > 0) {
    return (
      <SceneMergeDetails
        sources={loadedSources}
        dest={loadedDest!}
        onClose={(values) => {
          if (values) {
            onMerge(values);
          } else {
            onClose();
          }
        }}
      />
    );
  }

  return (
    <Modal
      show={show}
      header={title}
      icon={faSignInAlt}
      accept={{
        text: intl.formatMessage({ id: "actions.next_action" }),
        onClick: () => loadScenes(),
      }}
      disabled={!canMerge()}
      cancel={{
        variant: "secondary",
        onClick: () => onClose(),
      }}
      isRunning={running}
    >
      <div className="form-container row px-3">
        <div className="col-12 col-lg-6 col-xl-12">
          <Form.Group controlId="source" as={Row}>
            {FormUtils.renderLabel({
              title: intl.formatMessage({ id: "dialogs.merge.source" }),
              labelProps: {
                column: true,
                sm: 3,
                xl: 12,
              },
            })}
            <Col sm={9} xl={12}>
              <SceneSelect
                isMulti
                onSelect={(items) => setSourceScenes(items)}
                selected={sourceScenes}
              />
            </Col>
          </Form.Group>
          <Form.Group
            controlId="switch"
            as={Row}
            className="justify-content-center"
          >
            <Button
              variant="secondary"
              onClick={() => switchScenes()}
              disabled={!sourceScenes.length || !destScene.length}
              title={intl.formatMessage({ id: "actions.swap" })}
            >
              <Icon className="fa-fw" icon={faExchangeAlt} />
            </Button>
          </Form.Group>
          <Form.Group controlId="destination" as={Row}>
            {FormUtils.renderLabel({
              title: intl.formatMessage({
                id: "dialogs.merge.destination",
              }),
              labelProps: {
                column: true,
                sm: 3,
                xl: 12,
              },
            })}
            <Col sm={9} xl={12}>
              <SceneSelect
                onSelect={(items) => setDestScene(items)}
                selected={destScene}
              />
            </Col>
          </Form.Group>
        </div>
      </div>
    </Modal>
  );
};
