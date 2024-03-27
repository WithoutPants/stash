import * as GQL from "src/core/generated-graphql";
import { ParseMode } from "./constants";
import { queryFindStudio } from "src/core/StashService";
import { mergeStashIDs } from "src/utils/stashbox";
import { stringToGender } from "src/utils/gender";

const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const ddmmyyRegex = /\.(\d\d)\.(\d\d)\.(\d\d)\./;
const yyyymmddRegex = /(\d{4})[-.](\d{2})[-.](\d{2})/;
const mmddyyRegex = /(\d{2})[-.](\d{2})[-.](\d{4})/;
const ddMMyyRegex = new RegExp(
  `(\\d{1,2}).(${months.join("|")})\\.?.(\\d{4})`,
  "i"
);
const MMddyyRegex = new RegExp(
  `(${months.join("|")})\\.?.(\\d{1,2}),?.(\\d{4})`,
  "i"
);
const parseDate = (input: string): string => {
  let output = input;
  const ddmmyy = output.match(ddmmyyRegex);
  if (ddmmyy) {
    output = output.replace(
      ddmmyy[0],
      ` 20${ddmmyy[1]}-${ddmmyy[2]}-${ddmmyy[3]} `
    );
  }
  const mmddyy = output.match(mmddyyRegex);
  if (mmddyy) {
    output = output.replace(
      mmddyy[0],
      ` ${mmddyy[1]}-${mmddyy[2]}-${mmddyy[3]} `
    );
  }
  const ddMMyy = output.match(ddMMyyRegex);
  if (ddMMyy) {
    const month = (months.indexOf(ddMMyy[2].toLowerCase()) + 1)
      .toString()
      .padStart(2, "0");
    output = output.replace(
      ddMMyy[0],
      ` ${ddMMyy[3]}-${month}-${ddMMyy[1].padStart(2, "0")} `
    );
  }
  const MMddyy = output.match(MMddyyRegex);
  if (MMddyy) {
    const month = (months.indexOf(MMddyy[1].toLowerCase()) + 1)
      .toString()
      .padStart(2, "0");
    output = output.replace(
      MMddyy[0],
      ` ${MMddyy[3]}-${month}-${MMddyy[2].padStart(2, "0")} `
    );
  }

  const yyyymmdd = output.search(yyyymmddRegex);
  if (yyyymmdd !== -1)
    return (
      output.slice(0, yyyymmdd).replace(/-/g, " ") +
      output.slice(yyyymmdd, yyyymmdd + 10).replace(/\./g, "-") +
      output.slice(yyyymmdd + 10).replace(/-/g, " ")
    );
  return output.replace(/-/g, " ");
};

export function prepareQueryString(
  scene: Partial<GQL.SlimSceneDataFragment>,
  paths: string[],
  filename: string,
  mode: ParseMode,
  blacklist: string[]
) {
  if ((mode === "auto" && scene.date && scene.studio) || mode === "metadata") {
    let str = [
      scene.date,
      scene.studio?.name ?? "",
      (scene?.performers ?? []).map((p) => p.name).join(" "),
      scene?.title ? scene.title.replace(/[^a-zA-Z0-9 ]+/g, "") : "",
    ]
      .filter((s) => s !== "")
      .join(" ");
    blacklist.forEach((b) => {
      str = str.replace(new RegExp(b, "gi"), " ");
    });
    return str;
  }
  let s = "";

  if (mode === "auto" || mode === "filename") {
    s = filename;
  } else if (mode === "path") {
    s = [...paths, filename].join(" ");
  } else if (mode === "dir" && paths.length) {
    s = paths[paths.length - 1];
  }
  blacklist.forEach((b) => {
    s = s.replace(new RegExp(b, "gi"), " ");
  });
  s = parseDate(s);
  return s.replace(/\./g, " ").replace(/ +/g, " ");
}

export const parsePath = (filePath: string) => {
  if (!filePath) {
    return {
      paths: [],
      file: "",
      ext: "",
    };
  }

  const path = filePath.toLowerCase();
  // Absolute paths on Windows start with a drive letter (e.g. C:\)
  // Alternatively, they may start with a UNC path (e.g. \\server\share)
  // Remove the drive letter/UNC and replace backslashes with forward slashes
  const normalizedPath = path.replace(/^[a-z]:|\\\\/, "").replace(/\\/g, "/");
  const pathComponents = normalizedPath
    .split("/")
    .filter((component) => component.trim().length > 0);
  const fileName = pathComponents[pathComponents.length - 1];

  const ext = fileName.match(/\.[a-z0-9]*$/)?.[0] ?? "";
  const file = fileName.slice(0, ext.length * -1);

  // remove any .. or . paths
  const paths = (
    pathComponents.length >= 1
      ? pathComponents.slice(0, pathComponents.length - 1)
      : []
  ).filter((p) => p !== ".." && p !== ".");

  return { paths, file, ext };
};

export async function mergeStudioStashIDs(
  id: string,
  newStashIDs: GQL.StashIdInput[]
) {
  const existing = await queryFindStudio(id);
  if (existing?.data?.findStudio?.stash_ids) {
    return mergeStashIDs(existing.data.findStudio.stash_ids, newStashIDs);
  }

  return newStashIDs;
}

export function performerCreateInputFromScraped(
  performer: GQL.ScrapedPerformer,
  imageIndex: number | undefined,
  endpoint?: string
) {
  const performerData: GQL.PerformerCreateInput & {
    [index: string]: unknown;
  } = {
    name: performer.name ?? "",
    disambiguation: performer.disambiguation ?? "",
    alias_list: performer.aliases?.split(",").map((a) => a.trim()) ?? undefined,
    gender: stringToGender(performer.gender ?? undefined, true),
    birthdate: performer.birthdate,
    ethnicity: performer.ethnicity,
    eye_color: performer.eye_color,
    country: performer.country,
    height_cm: Number.parseFloat(performer.height ?? "") ?? undefined,
    measurements: performer.measurements,
    fake_tits: performer.fake_tits,
    career_length: performer.career_length,
    tattoos: performer.tattoos,
    piercings: performer.piercings,
    urls: performer.urls,
    image:
      imageIndex !== undefined && (performer.images?.length ?? 0) > imageIndex
        ? performer.images?.[imageIndex]
        : undefined,
    details: performer.details,
    death_date: performer.death_date,
    hair_color: performer.hair_color,
    weight: Number.parseFloat(performer.weight ?? "") ?? undefined,
  };

  if (Number.isNaN(performerData.weight ?? 0)) {
    performerData.weight = undefined;
  }

  if (Number.isNaN(performerData.height ?? 0)) {
    performerData.height = undefined;
  }

  if (performer.tags) {
    performerData.tag_ids = performer.tags
      .map((t) => t.stored_id)
      .filter((t) => t) as string[];
  }

  // stashid handling code
  const remoteSiteID = performer.remote_site_id;
  if (remoteSiteID && endpoint) {
    performerData.stash_ids = [
      {
        endpoint,
        stash_id: remoteSiteID,
      },
    ];
  }

  return performerData;
}

export function studioCreateInputFromScraped(
  studio: GQL.ScrapedStudio,
  endpoint?: string
) {
  const studioData: GQL.StudioCreateInput = {
    name: studio.name,
    url: studio.url,
    image: studio.image,
    parent_id: studio.parent?.stored_id,
  };

  // stashid handling code
  const remoteSiteID = studio.remote_site_id;
  if (remoteSiteID && endpoint) {
    studioData.stash_ids = [
      {
        endpoint,
        stash_id: remoteSiteID,
      },
    ];
  }

  return studioData;
}

export function tagCreateInputFromScraped(
  tag: GQL.ScrapedTag
  /* endpoint?: string */
) {
  const tagData: GQL.TagCreateInput = { name: tag.name };

  // stashid handling code
  // const remoteSiteID = tag.remote_site_id;
  // if (remoteSiteID && endpoint) {
  //   tagData.stash_ids = [
  //     {
  //       endpoint,
  //       stash_id: remoteSiteID,
  //     },
  //   ];
  // }

  return tagData;
}
