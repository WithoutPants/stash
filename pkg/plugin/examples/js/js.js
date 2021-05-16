var tagName = "Hawwwwt"

function main() {
    var modeArg = input.Args.mode;
    try {
        if (modeArg == "" || modeArg == "add") {
            addTag();
        } else if (modeArg == "remove") {
            removeTag();
        } else if (modeArg == "long") {
            doLongTask();
        } else if (modeArg == "indef") {
            doIndefiniteTask();
        }
    } catch (err) {
        return {
            Error: err
        };
    }

    return {
        Output: "ok"
    };
}

function getResult(result) {
    if (result[1]) {
        throw result[1];
    }

    return result[0];
}

function getTagID(create) {
	console.log("Checking if tag exists already (via GQL)")

	// see if tag exists already
    var query = "\
query {\
  allTags {\
    id\
    name\
  }\
}"
	
    var result = gql(query);
    var allTags = result["allTags"];
    
    var tag;
	for (var i = 0; i < allTags.length; ++i) {
		if (allTags[i].name === tagName) {
			tag = allTags[i];
			break;
		}
	}

    if (tag) {
        console.log("found existing tag");
        return tag.id;
    }

	if (!create) {
		console.log("Not found and not creating");
		return null;
	}

    console.log("Creating new tag");

    var mutation = "\
mutation tagCreate($input: TagCreateInput!) {\
  tagCreate(input: $input) {\
    id\
  }\
}";

    var variables = {
        input: {
            'name': tagName
        }
    };

    result = gql(mutation, variables);
    console.log("tag id = " + result.tagCreate.id);
	return result.tagCreate.id;
}

function addTag() {
    var tagID = getTagID(true)
    
	var scene = findRandomScene();

	if (scene === null) {
		throw "no scenes to add tag to";
	}

    var tagIds = []
    var found = false;
	for (var i = 0; i < scene.tags.length; ++i) {
        var sceneTagID = scene.tags[i].id;
        if (tagID === sceneTagID) {
            found = true;
        }
        tagIds.push(sceneTagID);
    }
	
    if (found) {
        console.log("already has tag");
        return;
    }
	    
    tagIds.push(tagID)

    var mutation = "\
mutation sceneUpdate($input: SceneUpdateInput!) {\
    sceneUpdate(input: $input) {\
        id\
    }\
}";

    var variables = {
        input: {
            id: scene.id,
            tag_ids: tagIds,
        }
    };

    console.log("Adding tag to scene " + scene.id);

    gql(mutation, variables);
}

function removeTag() {
	var tagID = getTagID(false);

	if (tagID == null) {
		console.log("Tag does not exist. Nothing to remove");
		return
    }

	console.log("Destroying tag");
	
    var mutation = "\
mutation tagDestroy($input: TagDestroyInput!) {\
    tagDestroy(input: $input)\
}";

    var variables = {
        input: {
            id: tagID
        }
    };

    gql(mutation, variables);
}

function findRandomScene() {
	// get a random scene
    console.log("Finding a random scene")

    var query = "\
query findScenes($filter: FindFilterType!) {\
    findScenes(filter: $filter) {\
        count\
        scenes {\
            id\
            tags {\
                id\
            }\
        }\
    }\
}"

    var variables = {
        filter: {
            per_page: 1,
            sort: 'random'
        }
    };

    var result = gql(query, variables);
    var findScenes = result["findScenes"];
    
    if (findScenes.Count === 0) {
        return null;
    }

    return findScenes.scenes[0];
}

function doLongTask() {
	var total = 100;
	var upTo = 0;

	console.log("Doing long task");
	while (upTo < total) {
		sleep(1000)

		//log.LogProgress(float(upTo) / float(total))
		upTo = upTo + 1
    }
}

function doIndefiniteTask() {
	console.log("Sleeping indefinitely");
	while (true) {
		sleep(1000);
    }
}

main();