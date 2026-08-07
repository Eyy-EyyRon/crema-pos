Hide navigation

Search or Ask AI

`⌘`  `K`

[Home](https://docs.expo.dev/) [Guides](https://docs.expo.dev/guides/overview) [EAS](https://docs.expo.dev/eas) [Reference](https://docs.expo.dev/versions/latest) [Learn](https://docs.expo.dev/tutorial/overview)

Reference version

SDK 57

[Archive](https://docs.expo.dev/archive) [Expo Snack](https://snack.expo.dev/) [Discord and forums](https://chat.expo.dev/) [Newsletter](https://expo.dev/mailing-list/signup)

This documentation is available as Markdown for AI agents and LLMs. See the [full Markdown index](https://docs.expo.dev/llms.txt) or append .md to any documentation URL.

# ![Expo FileSystem icon](https://docs.expo.dev/static/images/packages/expo-file-system.png)Expo FileSystem

A library that provides access to the local file system on the device.

Android

iOS

tvOS

Included in Expo Go

[GitHub](https://github.com/expo/expo/tree/sdk-57/packages/expo-file-system) [npm](https://www.npmjs.com/package/expo-file-system) [Changelog](https://github.com/expo/expo/tree/sdk-57/packages/expo-file-system/CHANGELOG.md)

Recommended version:

~57.0.2

Copy page

* * *

`expo-file-system` provides access to files and directories stored on a device or bundled as assets into the native project. It also allows downloading files from the network.

## Installation

Terminalnpmyarnpnpmbun

Copy

`-``npx expo install expo-file-system`

If you are installing this in an [existing React Native app](https://docs.expo.dev/bare/overview),make sure to [install `expo`](https://docs.expo.dev/bare/installing-expo-modules) in your project.

## Configuration in app config

You can configure `expo-file-system` using its built-in [config plugin](https://docs.expo.dev/config-plugins/introduction) if you use config plugins in your project ( [Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does not use CNG, then you'll need to manually configure the library.

### Example app.json with config plugin

app.json

Copy

```
{
  "expo": {
    "plugins": [\
      [\
        "expo-file-system",\
        {\
          "supportsOpeningDocumentsInPlace": true,\
          "enableFileSharing": true\
        }\
      ]\
    ]
  }
}
```

### Configurable properties

| Name | Default | Description |
| --- | --- | --- |
| `supportsOpeningDocumentsInPlace` | `false` | Only for:<br>iOS<br>A boolean to enable `LSSupportsOpeningDocumentsInPlace` in Info.plist. This allows the app to open documents in place. |
| `enableFileSharing` | `false` | Only for:<br>iOS<br>A boolean to enable `UIFileSharingEnabled` in Info.plist. This enables file sharing in the iOS Files app, making the app's Documents directory accessible to users through the Files app, iTunes File Sharing, and other file management tools. |

Are you using this library in an existing React Native app? [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#are-you-using-this-library-in-an)

If you're not using Continuous Native Generation ( [CNG](https://docs.expo.dev/workflow/continuous-native-generation)) or you're using native ios project manually, then you need to add the `LSSupportsOpeningDocumentsInPlace` and `UIFileSharingEnabled` keys to your project's ios/\[app\]/Info.plist:

```
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
<key>UIFileSharingEnabled</key>
<true/>
```

## Usage

```
import { File, Directory, Paths } from 'expo-file-system';
```

The `File` and `Directory` instances hold a reference to a file, content, or asset URI.

The file or directory does not need to exist — an error will be thrown from the constructor only if the wrong class is used to represent an existing path (so if you try to create a `File` instance passing a path to an already existing directory).

## Features

- Both synchronous and asynchronous, read and write access to file contents
- Creation, modification and deletion
- Available properties, such as `type`, `size`, `creationDate`, and more
- Ability to read and write files as streams or using the `FileHandle` class
- Easy file download/upload using `downloadFileAsync` or `expo/fetch`

## Examples

Writing and reading text files [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#writing-and-reading-text-files)

example.ts

Copy

```
import { File, Paths } from 'expo-file-system';

try {
  const file = new File(Paths.cache, 'example.txt');
  file.create(); // can throw an error if the file already exists or no permission to create it
  file.write('Hello, world!');
  console.log(file.textSync()); // Hello, world!
} catch (error) {
  console.error(error);
}
```

Picking files using system pickers [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#picking-files-using-system-pickers)

Usage with `expo-document-picker`:

example.ts

Copy

```
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

try {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (!result.canceled) {
    const { uri } = result.assets[0];
    const file = new File(uri);
    console.log(file.textSync());
  }
} catch (error) {
  console.error(error);
}
```

Using the built-in `pickFileAsync` or `pickDirectoryAsync` method on Android:

example.ts

Copy

```
import { File } from 'expo-file-system';

try {
  const file = new File.pickFileAsync();
  console.log(file.textSync());
} catch (error) {
  console.error(error);
}
```

Downloading files [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#downloading-files)

Using `downloadFileAsync`:

example.ts

Copy

```
import { Directory, File, Paths } from 'expo-file-system';

const url = 'https://pdfobject.com/pdf/sample.pdf';
const destination = new Directory(Paths.cache, 'pdfs');
try {
  destination.create();
  const output = await File.downloadFileAsync(url, destination);
  console.log(output.exists); // true
  console.log(output.uri); // path to the downloaded file, e.g., '${cacheDirectory}/pdfs/sample.pdf'
} catch (error) {
  console.error(error);
}
```

Or using `expo/fetch`:

example.ts

Copy

```
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

const url = 'https://pdfobject.com/pdf/sample.pdf';
const response = await fetch(url);
const src = new File(Paths.cache, 'file.pdf');
src.write(await response.bytes());
```

Uploading files using `expo/fetch` [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#uploading-files-using-expofetch)

You can upload files as blobs directly with `fetch` built into the Expo package:

example.ts

Copy

```
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

const file = new File(Paths.cache, 'file.txt');
file.write('Hello, world!');

const response = await fetch('https://example.com', {
  method: 'POST',
  body: file,
});
```

Or using the `FormData` constructor:

example.ts

Copy

```
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

const file = new File(Paths.cache, 'file.txt');
file.write('Hello, world!');
const formData = new FormData();
formData.append('data', file);
const response = await fetch('https://example.com', {
  method: 'POST',
  body: formData,
});
```

Moving and copying files [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#moving-and-copying-files)

example.ts

Copy

```
import { Directory, File, Paths } from 'expo-file-system';
try {
  const file = new File(Paths.document, 'example.txt');
  file.create();
  console.log(file.uri); // '${documentDirectory}/example.txt'
  const copiedFile = new File(Paths.cache, 'example-copy.txt');
  file.copy(copiedFile);
  console.log(copiedFile.uri); // '${cacheDirectory}/example-copy.txt'
  file.move(Paths.cache);
  console.log(file.uri); // '${cacheDirectory}/example.txt'
  file.move(new Directory(Paths.cache, 'newFolder'));
  console.log(file.uri); // '${cacheDirectory}/newFolder/example.txt'
} catch (error) {
  console.error(error);
}
```

Using legacy FileSystem API [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#using-legacy-filesystem-api)

example.ts

Copy

```
import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';

try {
  const file = new File(Paths.cache, 'example.txt');
  const content = await FileSystem.readAsStringAsync(file.uri);
  console.log(content);
} catch (error) {
  console.error(error);
}
```

Listing directory contents recursively [Permalink](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#listing-directory-contents-recursively)

example.ts

Copy

```
import { Directory, Paths } from 'expo-file-system';

function printDirectory(directory: Directory, indent: number = 0) {
  console.log(`${' '.repeat(indent)} + ${directory.name}`);
  const contents = directory.list();
  for (const item of contents) {
    if (item instanceof Directory) {
      printDirectory(item, indent + 2);
    } else {
      console.log(`${' '.repeat(indent + 2)} - ${item.name} (${item.size} bytes)`);
    }
  }
}

try {
  printDirectory(new Directory(Paths.cache));
} catch (error) {
  console.error(error);
}
```

## API

## Classes

### `Directory`

Type: Class extends `FileSystemDirectory`

Represents a directory on the filesystem.

A `Directory` instance can be created for any path, and does not need to exist on the filesystem during creation.

The constructor accepts an array of strings that are joined to create the directory URI. The first argument can also be a `Directory` instance (like `Paths.cache`).

Example

```
const directory = new Directory(Paths.cache, "subdirName");
```

Directory Properties

### `exists`

Type:`boolean`

A boolean representing if a directory exists and can be accessed.

### `size`

Literal type: `union`

A size of the directory in bytes. Null if the directory does not exist, or it cannot be read.

Acceptable values are:`number` \| `null`

### `uri`

Read only • Type:`string`

Represents the directory URI. The field is read-only, but it may change as a result of calling some methods such as `move`.

### `name`

Type:`string`

Directory name.

### `parentDirectory`

Type:`Directory`

Directory containing the file.

Directory Methods

### `copy(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Copies a directory.

Returns:

`Promise<void>`

### `copySync(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Copies a directory synchronously.

Returns:

`void`

### `create(options)`

| Parameter | Type |
| --- | --- |
| options(optional) | `DirectoryCreateOptions` |

Creates a directory that the current uri points to.

Returns:

`void`

### `createDirectory(name)`

| Parameter | Type |
| --- | --- |
| name | `string` |

Returns:

`Directory`

### `createFile(name, mimeType)`

| Parameter | Type |
| --- | --- |
| name | `string` |
| mimeType | `string | null` |

Returns:

`File`

### `delete()`

Deletes a directory. Also deletes all files and directories inside the directory.

Returns:

`void`

### `info()`

Retrieves an object containing properties of a directory.

Returns:

`DirectoryInfo`

An object with directory metadata (for example, size, creation date, and so on).

### `list()`

Lists the contents of a directory.
Calling this method if the parent directory does not exist will throw an error.

Returns:

`(File | Directory)[]`

An array of `Directory` and `File` instances.

### `move(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Moves a directory. Updates the `uri` property that now points to the new location.

Returns:

`Promise<void>`

### `moveSync(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Moves a directory synchronously. Updates the `uri` property that now points to the new location.

Returns:

`void`

### `rename(newName)`

| Parameter | Type |
| --- | --- |
| newName | `string` |

Renames a directory.

Returns:

`void`

### `watch(callback, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| callback | `(event: WatchEvent<File | Directory>) => void` | Invoked when a change is detected. Receives a `WatchEvent` describing what changed. |
| options(optional) | `WatchOptions` | Configuration for debouncing and filtering events. |

Watches this directory for changes to its contents or the directory itself.

Events are emitted when files or subdirectories are created, modified, deleted, or renamed
within this directory. On iOS, child changes are surfaced as a coarse-grained `modified` event
on the directory itself, so filtering for child-level `created`, `deleted`, or `renamed` events
is not reliable. The watcher automatically stops when the directory is deleted or renamed.
To stop watching manually, call `remove()` on the returned subscription.

Returns:

`WatchSubscription`

A subscription handle. Call `remove()` to stop watching.

Example

```
const cacheDir = new Directory(Paths.cache);
const subscription = cacheDir.watch((event) => {
  console.log(`${event.type}: ${event.target.uri}`);
});

// Later, stop watching:
subscription.remove();
```

### `DownloadTask`

Represents a download task with pause/resume support and progress tracking.

Download tasks start in the `idle` state. Calling `downloadAsync()` moves the task to `active`;
pausing moves it to `paused`, and a completed, cancelled, or failed transfer moves it to the
corresponding terminal state.

DownloadTask Properties

### `state`

Literal type: `string`

The current state of the download task.

Acceptable values are:`'idle'` \| `'active'` \| `'paused'` \| `'completed'` \| `'cancelled'` \| `'error'`

DownloadTask Methods

### `addListener(eventName, listener)`

| Parameter | Type | Description |
| --- | --- | --- |
| eventName | `'progress'` | The event to listen to. Only `'progress'` is supported. |
| listener | `(data: DownloadProgress) => void` | Invoked with download progress updates. |

Adds a listener for download progress events.

> Note: Prefer the `onProgress` option unless you need manual subscription control.

Returns:

`EventSubscription`

A subscription handle. Call `remove()` to stop listening.

### `cancel()`

Cancels the download operation.

If `downloadAsync()` or `resumeAsync()` is pending, its promise is rejected after the native
request is cancelled. Calling this method after the task reaches `completed`, `cancelled`, or
`error` has no effect.

Returns:

`void`

### `downloadAsync()`

Starts the download operation.

This method can only be called once, while the task is `idle`. The promise resolves with
the downloaded file when the transfer completes, or with `null` if the task is paused before
completion. It is rejected when the request fails or the task is cancelled.

If `options.signal` is aborted, the promise is rejected with an `AbortError`.

Returns:

`Promise<File | null>`

A promise that resolves to the downloaded file, or `null` when the task is paused.

### `fromSavable(state, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| state | `DownloadPauseState` | The saved pause state. |
| options(optional) | `DownloadTaskOptions` | Optional download task options to attach to the restored task. |

Creates a paused download task from saved state.

Use this to continue a download after persisting the value returned by `savable()`. New options
can attach progress callbacks or an abort signal because functions and signals are not stored
in `DownloadPauseState`. If both saved state and new options include headers, the new headers
override saved headers with the same names.

Returns:

`DownloadTask`

A download task in the `paused` state.

### `pause()`

Requests pausing the active download operation.

The pending `downloadAsync()` or `resumeAsync()` promise resolves with `null` after native
code produces resume data and the task enters the `paused` state. Use `pauseAsync()` if you
need to wait until the task is ready to resume or save.

Returns:

`void`

### `pauseAsync()`

Requests pausing the active download operation and waits until the task reaches the `paused`
state.

Returns:

`Promise<void>`

A promise that resolves after resume data is available.

### `release()`

Releases the native task handle.

Call this when you no longer need the task and want to release native resources manually.

Returns:

`void`

### `resumeAsync()`

Resumes a paused download operation.

The promise resolves with the downloaded file when the transfer completes, or with `null`
if the task is paused again before completion. It is rejected when the request fails or the task
is cancelled.

Returns:

`Promise<File | null>`

A promise that resolves to the downloaded file, or `null` when the task is paused.

### `savable()`

Returns the paused task state that can be persisted and restored later.

This method can only be called while the task is `paused`. The returned state contains
platform-specific resume data and request metadata, but does not include callbacks or abort
signals.

Returns:

`DownloadPauseState`

A serializable paused download state.

### `File`

Type: Class extends `FileSystemFile` implements `Blob`

Represents a file on the filesystem.

A `File` instance can be created for any path, and does not need to exist on the filesystem during creation.

The constructor accepts an array of strings that are joined to create the file URI. The first argument can also be a `Directory` instance (like `Paths.cache`) or a `File` instance (which creates a new reference to the same file).

Example

```
const file = new File(Paths.cache, "subdirName", "file.txt");
```

File Properties

### `contentUri`

Only for:
Android

Type:`string`

A content URI to the file that can be shared to external applications.

### `creationTime`

Literal type: `union`

A creation time of the file expressed in milliseconds since the epoch. Returns a `null` if the file does not exist, cannot be read or the Android version is earlier than API 26.

Acceptable values are:`number` \| `null`

### `exists`

Type:`boolean`

A boolean representing if a file exists. `true` if the file exists, `false` otherwise.
Also, `false` if the application does not have read access to the file.

### `lastModified`

Literal type: `union`

A last modification time of the file expressed in milliseconds since the epoch. Returns a `null` if the file does not exist, or if it cannot be read.

Acceptable values are:`number` \| `null`

### `md5`

Literal type: `union`

A md5 hash of the file. Null if the file does not exist, or it cannot be read.

Acceptable values are:`string` \| `null`

> Deprecated: In favor of `lastModified` to be more in line with web [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File)

### `modificationTime`

Literal type: `union`

A last modification time of the file expressed in milliseconds since the epoch. Returns a `null` if the file does not exist, or if it cannot be read.

Acceptable values are:`number` \| `null`

### `size`

Type:`number`

A size of the file in bytes. 0 if the file does not exist, or it cannot be read.

### `type`

Type:`string`

A mime type of the file. An empty string if the file does not exist, or it cannot be read.

### `extension`

Type:`string`

File extension.

Example

`'.png'`

### `name`

Type:`string`

File name. Includes the extension.

### `parentDirectory`

Type:`Directory`

Directory containing the file.

### `uri`

Type:`string`

Represents the file URI. The field is read-only, but it may change as a result of calling some methods such as `move`.

File Methods

### `arrayBuffer()`

The `arrayBuffer()` method of the Blob interface returns a Promise that resolves with the contents of the blob as binary data contained in an ArrayBuffer.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/arrayBuffer)

Returns:

`Promise<ArrayBuffer>`

### `base64()`

Retrieves content of the file as base64.

Returns:

`Promise<string>`

A promise that resolves to the contents of the file as a base64 string.

### `base64Sync()`

Retrieves content of the file as base64.

Returns:

`string`

The contents of the file as a base64 string.

### `bytes()`

Retrieves byte content of the entire file.

Returns:

`Promise<Uint8Array<ArrayBuffer>>`

A promise that resolves to the contents of the file as a `Uint8Array`.

### `bytesSync()`

Retrieves byte content of the entire file.

Returns:

`Uint8Array`

The contents of the file as a `Uint8Array`.

### `copy(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Copies a file.

Returns:

`Promise<void>`

### `copySync(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Copies a file synchronously.

Returns:

`void`

### `create(options)`

| Parameter | Type |
| --- | --- |
| options(optional) | `FileCreateOptions` |

Creates a file.

Returns:

`void`

### `createDownloadTask(url, destination, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| url | `string` | The URL of the file to download. |
| destination | `File | Directory` | The destination file or directory. If a directory is provided, the<br>resulting filename is determined from the response headers or URL. |
| options(optional) | `DownloadTaskOptions` | Download task options. |

Creates a download task without starting it.

Call `downloadAsync()` on the returned task to start the download. Use this when you need
pause/resume support, task state, cancellation, or manual progress subscriptions.

Returns:

`DownloadTask`

A download task that can be started with `downloadAsync()`.

Example

```
const destination = new File(Paths.document, 'video.mp4');
const task = File.createDownloadTask('https://example.com/video.mp4', destination, {
  onProgress: ({ bytesWritten, totalBytes }) => {
    console.log(`${bytesWritten} / ${totalBytes}`);
  },
});

const file = await task.downloadAsync();
```

### `createUploadTask(url, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| url | `string` | The URL to upload the file to. |
| options(optional) | `UploadOptions` | Upload options. |

Creates an upload task for this file without starting it.

Call `uploadAsync()` on the returned task to start the upload. Use this when you need to
inspect task state, cancel the upload, or subscribe to progress manually.

Returns:

`UploadTask`

An upload task that can be started with `uploadAsync()`.

Example

```
const file = new File(Paths.document, 'photo.jpg');
const task = file.createUploadTask('https://example.com/upload', {
  uploadType: UploadType.MULTIPART,
  onProgress: ({ bytesSent, totalBytes }) => {
    console.log(`${bytesSent} / ${totalBytes}`);
  },
});

const result = await task.uploadAsync();
```

### `delete()`

Deletes a file.

Returns:

`void`

### `formData()`

Returns:

`Promise<FormData>`

### `info(options)`

| Parameter | Type |
| --- | --- |
| options(optional) | `InfoOptions` |

Retrieves an object containing properties of a file

Returns:

`FileInfo`

An object with file metadata (for example, size, creation date, and so on).

### `json()`

Returns:

`Promise<any>`

### `move(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Moves a directory. Updates the `uri` property that now points to the new location.

Returns:

`Promise<void>`

### `moveSync(destination, options)`

| Parameter | Type |
| --- | --- |
| destination | `File | Directory` |
| options(optional) | `RelocationOptions` |

Moves a file synchronously. Updates the `uri` property that now points to the new location.

Returns:

`void`

### `open(mode)`

| Parameter | Type | Description |
| --- | --- | --- |
| mode(optional) | `FileMode` | The [`FileMode`](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#filemode) to use.<br>- On Android, SAF `content://` URIs do not support `ReadWrite` mode.<br>- Defaults:<br>  - For SAF `content://` URIs, the default is `FileMode.ReadOnly`.<br>  - For standard `file://` URIs, the default is `FileMode.ReadWrite`. |

Returns A `FileHandle` object that can be used to read and write data to the file.

Returns:

`FileHandle`

### `pickFileAsync(options)`

Overload #1

| Parameter | Type | Description |
| --- | --- | --- |
| options(optional) | `PickSingleFileOptions` | File picker options. |

Opens the system file picker for selecting a single file.

This overload requires `options.multipleFiles` to be `undefined` or `false`.

Returns:

`Promise<PickSingleFileResult>`

### `pickFileAsync(options)`

Overload #2

| Parameter | Type | Description |
| --- | --- | --- |
| options(optional) | `PickMultipleFilesOptions` | File picker options. |

Opens the system file picker for selecting multiple files.

This overload requires `options.multipleFiles` to be `true`.

Returns:

`Promise<PickMultipleFilesResult>`

Example

```
const result = await File.pickFileAsync({
  multipleFiles: true,
  mimeTypes: ['image/*', 'application/pdf'],
});

if (!result.canceled) {
  for (const file of result.result) {
    console.log(file.uri);
  }
}
```

> Deprecated: Use `pickFileAsync({initialUri, mimeTypes: mimeType})` instead.

### `pickFileAsync(initialUri, mimeType)`

Overload #3

| Parameter | Type | Description |
| --- | --- | --- |
| initialUri(optional) | `string` | An optional URI pointing to an initial folder on which the file picker is opened. |
| mimeType(optional) | `string` | A mime type that is used to filter out files that can be picked out. |

A static method that opens a file picker to select a single file of specified type. On iOS, it returns a temporary copy of the file leaving the original file untouched.

Selecting multiple files is not supported yet.

Returns:

`Promise<File | File[]>`

A `File` instance or an array of `File` instances.

### `readableStream()`

Returns:

`ReadableStream<Uint8Array<ArrayBuffer>>`

### `rename(newName)`

| Parameter | Type |
| --- | --- |
| newName | `string` |

Renames a file.

Returns:

`void`

### `slice(start, end, contentType)`

| Parameter | Type |
| --- | --- |
| start(optional) | `number` |
| end(optional) | `number` |
| contentType(optional) | `string` |

The `slice()` method of the Blob interface creates and returns a new Blob object which contains data from a subset of the blob on which it's called.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/slice)

Returns:

`Blob`

### `stream()`

The `stream()` method of the Blob interface returns a ReadableStream which upon reading returns the data contained within the Blob.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/stream)

Returns:

`ReadableStream<Uint8Array<ArrayBuffer>>`

### `text()`

Retrieves text from the file.

Returns:

`Promise<string>`

A promise that resolves to the contents of the file as string.

### `textSync()`

Retrieves text from the file.

Returns:

`string`

The contents of the file as string.

### `upload(url, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| url | `string` | The URL to upload the file to. |
| options(optional) | `UploadOptions` | Upload options. |

Uploads this file to a server and starts the request immediately.

The promise resolves with the HTTP response metadata and body for any completed response,
including non-2xx status codes. It is rejected only when the file cannot be read, the
request fails, or the upload is cancelled.

Returns:

`Promise<UploadResult>`

A promise that resolves to the upload result.

### `watch(callback, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| callback | `(event: WatchEvent<File>) => void` | Invoked when a change is detected. Receives a `WatchEvent` describing what changed. |
| options(optional) | `WatchOptions` | Configuration for debouncing and filtering events. |

Watches this file for changes on the filesystem.

The watcher automatically stops when the file is deleted or renamed. To stop watching manually,
call `remove()` on the returned subscription.

Returns:

`WatchSubscription`

A subscription handle. Call `remove()` to stop watching.

Example

```
const file = new File(Paths.cache, 'data.json');
const subscription = file.watch((event) => {
  console.log(`File ${event.type}`);
});

// Later, stop watching:
subscription.remove();
```

### `writableStream()`

Returns:

`WritableStream<Uint8Array<ArrayBufferLike>>`

### `write(content, options)`

| Parameter | Type | Description |
| --- | --- | --- |
| content | `string | Uint8Array<ArrayBufferLike>` | The content to write into the file. |
| options(optional) | `FileWriteOptions` | - |

Writes content to the file.

Returns:

`void`

### `Paths`

Type: Class extends `PathUtilities`

Paths Properties

### `appleSharedContainers`

Type:`Record<string, Directory>`

### `availableDiskSpace`

Type:`number`

A property that represents the available space on device's internal storage, represented in bytes.

### `bundle`

Type:`Directory`

A property containing the bundle directory – the directory where assets bundled with the application are stored.

### `cache`

Type:`Directory`

A property containing the cache directory – a place to store files that can be deleted by the system when the device runs low on storage.

### `document`

Type:`Directory`

A property containing the document directory – a place to store files that are safe from being deleted by the system.

### `totalDiskSpace`

Type:`number`

A property that represents the total space on device's internal storage, represented in bytes.

Paths Methods

### `basename(path, ext)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to get the base name from. |
| ext(optional) | `string` | An optional file extension. |

Returns the base name of a path.

Returns:

`string`

A string representing the base name.

### `dirname(path)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to get the directory name from. |

Returns the directory name of a path.

Returns:

`string`

A string representing the directory name.

### `extname(path)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to get the extension from. |

Returns the extension of a path.

Returns:

`string`

A string representing the extension.

### `info(...uris)`

| Parameter | Type |
| --- | --- |
| ...uris | `string[]` |

Returns an object that indicates if the specified path represents a directory.

Returns:

`PathInfo`

### `isAbsolute(path)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to check. |

Checks if a path is absolute.

Returns:

`boolean`

`true` if the path is absolute, `false` otherwise.

### `join(...paths)`

| Parameter | Type | Description |
| --- | --- | --- |
| ...paths | `(string | File | Directory)[]` | An array of path segments. |

Joins path segments into a single path.

Returns:

`string`

A string representing the joined path.

### `normalize(path)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to normalize. |

Normalizes a path.

Returns:

`string`

A string representing the normalized path.

### `parse(path)`

| Parameter | Type | Description |
| --- | --- | --- |
| path | `string | File | Directory` | The path to parse. |

Parses a path into its components.

Returns:

`{
base: string,
dir: string,
ext: string,
name: string,
root: string
}`

An object containing the parsed path components.

### `relative(from, to)`

| Parameter | Type | Description |
| --- | --- | --- |
| from | `string | File | Directory` | The base path. |
| to | `string | File | Directory` | The relative path. |

Resolves a relative path to an absolute path.

Returns:

`string`

A string representing the resolved path.

### `UploadTask`

Represents an upload task with progress tracking and cancellation support.

Upload tasks start in the `idle` state. Calling `uploadAsync()` moves the task to `active`,
then to `completed`, `cancelled`, or `error`.

UploadTask Properties

### `state`

Type:`UploadTaskState`

The current state of the upload task.

UploadTask Methods

### `addListener(eventName, listener)`

| Parameter | Type | Description |
| --- | --- | --- |
| eventName | `'progress'` | The event to listen to. Only `'progress'` is supported. |
| listener | `(data: UploadProgress) => void` | Invoked with upload progress updates. |

Adds a listener for upload progress events.

> Note: Prefer the `onProgress` option unless you need manual subscription control.

Returns:

`EventSubscription`

A subscription handle. Call `remove()` to stop listening.

### `cancel()`

Cancels the upload operation.

If `uploadAsync()` is pending, its promise is rejected after the native request is cancelled.
Calling this method after the task reaches `completed`, `cancelled`, or `error` has no effect.

Returns:

`void`

### `release()`

Releases the native task handle.

Call this when you no longer need the task and want to release native resources manually.

Returns:

`void`

### `uploadAsync()`

Starts the upload operation.

This method can only be called once, while the task is `idle`. The promise resolves
with response metadata and body for completed HTTP responses, including non-2xx status codes.
It is rejected when the file cannot be read, the request fails, or the task is cancelled.

If `options.signal` is aborted, the promise is rejected with an `AbortError`.

Returns:

`Promise<UploadResult>`

A promise that resolves to the upload response.

### `FileHandle`

FileHandle Properties

### `offset`

Literal type: `union`

A property that indicates the current byte offset in the file. Calling `readBytes` or `writeBytes` will read or write a specified amount of bytes starting from this offset. The offset is incremented by the number of bytes read or written.
The offset can be set to any value within the file size. If the offset is set to a value greater than the file size, the next write operation will append data to the end of the file.
Null if the file handle is closed.

Acceptable values are:`number` \| `null`

### `size`

Literal type: `union`

A size of the file in bytes or `null` if the file handle is closed.

Acceptable values are:`number` \| `null`

FileHandle Methods

### `close()`

Closes the file handle. This allows the file to be deleted, moved or read by a different process. Subsequent calls to `readBytes` or `writeBytes` will throw an error.

Returns:

`void`

### `readBytes(length)`

| Parameter | Type | Description |
| --- | --- | --- |
| length | `number` | The number of bytes to read. |

Reads the specified amount of bytes from the file at the current offset. Max amount of bytes read at once is capped by ArrayBuffer max size (32 bit signed MAX\_INT on Android and 64 bit on iOS), but you can read from a FileHandle multiple times.

Returns:

`Uint8Array<ArrayBuffer>`

### `writeBytes(bytes)`

| Parameter | Type | Description |
| --- | --- | --- |
| bytes | `Uint8Array` | A `Uint8Array` array containing bytes to write. |

Writes the specified bytes to the file at the current offset.

Returns:

`void`

## Methods

> Deprecated: Use `new File().copy()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.copyAsync(options)`

| Parameter | Type |
| --- | --- |
| options | `RelocatingOptions` |

Returns:

`Promise<void>`

> Deprecated: Import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.createDownloadResumable(uri, fileUri, options, callback, resumeData)`

| Parameter | Type |
| --- | --- |
| uri | `string` |
| fileUri | `string` |
| options(optional) | `DownloadOptions` |
| callback(optional) | `FileSystemNetworkTaskProgressCallback<DownloadProgressData>` |
| resumeData(optional) | `string` |

Returns:

`any`

> Deprecated: Import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.createUploadTask(url, fileUri, options, callback)`

| Parameter | Type |
| --- | --- |
| url | `string` |
| fileUri | `string` |
| options(optional) | `FileSystemUploadOptions` |
| callback(optional) | `FileSystemNetworkTaskProgressCallback<UploadProgressData>` |

Returns:

`any`

> Deprecated: Use `new File().delete()` or `new Directory().delete()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.deleteAsync(fileUri, options)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |
| options(optional) | `DeletingOptions` |

Returns:

`Promise<void>`

> Deprecated

### `FileSystem.deleteLegacyDocumentDirectoryAndroid()`

Returns:

`Promise<void>`

> Deprecated: Use `File.downloadFileAsync` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.downloadAsync(uri, fileUri, options)`

| Parameter | Type |
| --- | --- |
| uri | `string` |
| fileUri | `string` |
| options(optional) | `DownloadOptions` |

Returns:

`Promise<FileSystemDownloadResult>`

> Deprecated: Import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.getContentUriAsync(fileUri)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |

Returns:

`Promise<string>`

> Deprecated: Use `Paths.availableDiskSpace` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.getFreeDiskStorageAsync()`

Returns:

`Promise<number>`

> Deprecated: Use `new File().info` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.getInfoAsync(fileUri, options)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |
| options(optional) | `InfoOptions` |

Returns:

`Promise<FileInfo>`

> Deprecated: Use `Paths.totalDiskSpace` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.getTotalDiskCapacityAsync()`

Returns:

`Promise<number>`

> Deprecated: Use `new Directory().create()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.makeDirectoryAsync(fileUri, options)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |
| options(optional) | `MakeDirectoryOptions` |

Returns:

`Promise<void>`

> Deprecated: Use `new File().move()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.moveAsync(options)`

| Parameter | Type |
| --- | --- |
| options | `RelocatingOptions` |

Returns:

`Promise<void>`

> Deprecated: Use `new File().text()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.readAsStringAsync(fileUri, options)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |
| options(optional) | `ReadingOptions` |

Returns:

`Promise<string>`

> Deprecated: Use `new Directory().list()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.readDirectoryAsync(fileUri)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |

Returns:

`Promise<string[]>`

> Deprecated: Use `@expo/fetch` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.uploadAsync(url, fileUri, options)`

| Parameter | Type |
| --- | --- |
| url | `string` |
| fileUri | `string` |
| options(optional) | `FileSystemUploadOptions` |

Returns:

`Promise<FileSystemUploadResult>`

> Deprecated: Use `new File().write()` or import this method from `expo-file-system/legacy`. This method will throw in runtime.

### `FileSystem.writeAsStringAsync(fileUri, contents, options)`

| Parameter | Type |
| --- | --- |
| fileUri | `string` |
| contents | `string` |
| options(optional) | `WritingOptions` |

Returns:

`Promise<void>`

## Types

### `DirectoryCreateOptions`

| Property | Type | Description |
| --- | --- | --- |
| idempotent(optional) | `boolean` | This flag controls whether the `create` operation is idempotent<br>(safe to call multiple times without error).<br>If `true`, creating a file or directory that already exists will succeed silently.<br>If `false`, an error will be thrown when the target already exists.<br>Default:`false` |
| intermediates(optional) | `boolean` | Whether to create intermediate directories if they do not exist.<br>Default:`false` |
| overwrite(optional) | `boolean` | Whether to overwrite the directory if it exists.<br>Default:`false` |

### `DirectoryInfo`

| Property | Type | Description |
| --- | --- | --- |
| creationTime(optional) | `number` | A creation time of the directory expressed in milliseconds since epoch. Returns null if the Android version is earlier than API 26. |
| exists | `boolean` | Indicates whether the directory exists. |
| files(optional) | `string[]` | A list of file names contained within a directory. |
| modificationTime(optional) | `number` | The last modification time of the directory expressed in milliseconds since epoch. |
| size(optional) | `number` | The size of the file in bytes. |
| uri(optional) | `string` | A `file://` URI pointing to the directory. |

### `DownloadOptions`

| Property | Type | Description |
| --- | --- | --- |
| headers(optional) | `undefined` | The headers to send with the request. |
| idempotent(optional) | `boolean` | This flag controls whether the `download` operation is idempotent<br>(safe to call multiple times without error).<br>If `true`, downloading a file that already exists overwrites the previous one.<br>If `false`, an error is thrown when the target file already exists.<br>Default:`false` |
| onProgress(optional) | `(data: DownloadProgress) => void` | A callback that is invoked with progress updates during the download. |
| signal(optional) | `AbortSignal` | An `AbortSignal` that can be used to cancel the download.<br>When the signal is aborted, the download is cancelled and the promise rejects with an `AbortError`. |

### `DownloadPauseState`

Represents the state of a paused download that can be persisted and resumed later.

| Property | Type | Description |
| --- | --- | --- |
| fileUri | `string` | The destination file or directory URI. |
| headers(optional) | `Record<string, string>` | Custom headers that were used for the download request. |
| isDirectory | `boolean` | Whether the destination is a directory. When `true`, the filename is derived from the URL. |
| resumeData(optional) | `string` | Platform-specific opaque resume data. |
| url | `string` | The URL of the download. |

### `DownloadProgress`

Data provided to the `onProgress` callback during a file download.

| Property | Type | Description |
| --- | --- | --- |
| bytesWritten | `number` | The number of bytes written so far. |
| totalBytes | `number` | The total number of bytes expected to be downloaded. `-1` if the server did not provide a `Content-Length` header. |

### `DownloadTaskOptions`

Options for download task operations.

| Property | Type | Description |
| --- | --- | --- |
| headers(optional) | `Record<string, string>` | Custom headers to include in the request. |
| onProgress(optional) | `(data: DownloadProgress) => void` | Callback for download progress updates. |
| sessionType(optional) | `NetworkTaskSessionType` | Only for:<br>iOS<br>Determines whether the iOS native session should continue in the background.<br>Android accepts this option for API consistency and ignores it.<br>When set to `'background'`, the native transfer may continue after the app is<br>suspended. However, the JavaScript `DownloadTask` instance is not<br>restored if the app is terminated or relaunched, so its promise, progress<br>callbacks, and cancellation state are only available while the original JS<br>runtime is still alive.<br>Default:`'background'` |
| signal(optional) | `AbortSignal` | AbortSignal to cancel the download. |

### `DownloadTaskState`

Literal type: `string`

Represents the current state of a download task.

Acceptable values are:`'idle'` \| `'active'` \| `'paused'` \| `'completed'` \| `'cancelled'` \| `'error'`

### `FileCreateOptions`

| Property | Type | Description |
| --- | --- | --- |
| intermediates(optional) | `boolean` | Whether to create intermediate directories if they do not exist.<br>Default:`false` |
| overwrite(optional) | `boolean` | Whether to overwrite the file if it exists.<br>Default:`false` |

### `FileInfo`

| Property | Type | Description |
| --- | --- | --- |
| creationTime(optional) | `number` | A creation time of the file expressed in milliseconds since epoch. Returns null if the Android version is earlier than API 26. |
| exists | `boolean` | Indicates whether the file exists. |
| md5(optional) | `string` | Present if the `md5` option was truthy. Contains the MD5 hash of the file. |
| modificationTime(optional) | `number` | The last modification time of the file expressed in milliseconds since epoch. |
| size(optional) | `number` | The size of the file in bytes. |
| uri(optional) | `string` | A URI pointing to the file. This is the same as the `fileUri` input parameter<br>and preserves its scheme (for example, `file://` or `content://`). |

### `FileWriteOptions`

| Property | Type | Description |
| --- | --- | --- |
| append(optional) | `boolean` | Whether to append the contents to the end of the file or overwrite the existing file.<br>Default:`false` |
| encoding(optional) | `EncodingType | 'utf8' | 'base64'` | The encoding format to use when writing the file.<br>Default:`FileSystem.EncodingType.UTF8` |

### `InfoOptions`

| Property | Type | Description |
| --- | --- | --- |
| md5(optional) | `boolean` | Whether to return the MD5 hash of the file.<br>Default:`false` |

### `NetworkTaskSessionType`

Literal type: `string`

The native URL session mode used by iOS upload and download tasks.

Acceptable values are:`'background'` \| `'foreground'`

### `PathInfo`

| Property | Type | Description |
| --- | --- | --- |
| exists | `boolean` | Indicates whether the path exists. Returns true if it exists; false if the path does not exist or if there is no read permission. |
| isDirectory | `boolean | null` | Indicates whether the path is a directory. Returns true or false if the path exists; otherwise, returns null. |

### `PickFileGeneralOptions`

Shared options accepted by file picker calls.

| Property | Type | Description |
| --- | --- | --- |
| initialUri(optional) | `string` | A URI pointing to an initial folder in which the file picker is opened. |
| mimeTypes(optional) | `string | string[]` | The [MIME type(s)](https://en.wikipedia.org/wiki/Media_type) of the documents that are available<br>to be picked. It also supports wildcards like `'image/*'` to choose any image. To allow any type<br>of document you can use `'*/*'`.<br>Default:`'*/*'` |
| multipleFiles(optional) | `boolean` | Allows multiple files to be selected from the system UI.<br>Default:`false` |

### `PickMultipleFilesOptions`

Options for picking multiple files.

Type:`PickFileGeneralOptions`extended by:

| Property | Type | Description |
| --- | --- | --- |
| multipleFiles | `true` | Allows multiple files to be selected from the system UI. |

### `PickMultipleFilesResult`

Result type for picking multiple files.

Successful picks return `{ result: File[], canceled: false }`. Canceled picks return
`{ result: null, canceled: true }`.

Type:`object` shaped as below:

| Property | Type | Description |
| --- | --- | --- |
| canceled | `false` | Indicates that the picker completed with selected files. |
| result | `File[]` | The selected files. |

Or `object` shaped as below:

| Property | Type | Description |
| --- | --- | --- |
| canceled | `true` | Indicates that the user canceled the picker without selecting files. |
| result | `null` | Always `null` when the picker is canceled. |

### `PickSingleFileOptions`

Options for picking a single file.

Type:`PickFileGeneralOptions`extended by:

| Property | Type | Description |
| --- | --- | --- |
| multipleFiles(optional) | `false` | Keeps the picker in single-file mode. Omit this property or set it to `false` when selecting one file.<br>Default:`false` |

### `PickSingleFileResult`

Result type for picking a single file.

Successful picks return `{ result: File, canceled: false }`. Canceled picks return
`{ result: null, canceled: true }`.

Type:`object` shaped as below:

| Property | Type | Description |
| --- | --- | --- |
| canceled | `false` | Indicates that the picker completed with a selected file. |
| result | `File` | The selected file. |

Or `object` shaped as below:

| Property | Type | Description |
| --- | --- | --- |
| canceled | `true` | Indicates that the user canceled the picker without selecting files. |
| result | `null` | Always `null` when the picker is canceled. |

### `RelocationOptions`

Options for moving or copying files and directories.

| Property | Type | Description |
| --- | --- | --- |
| overwrite(optional) | `boolean` | Whether to overwrite the destination if it exists.<br>Default:`false` |

### `UploadOptions`

Options for upload operations.

| Property | Type | Description |
| --- | --- | --- |
| fieldName(optional) | `string` | The field name for the file in multipart uploads.<br>Default:`'file'` |
| headers(optional) | `Record<string, string>` | Custom headers to include in the request. |
| httpMethod(optional) | `'POST' | 'PUT' | 'PATCH'` | The HTTP method to use.<br>Default:`'POST'` |
| mimeType(optional) | `string` | The MIME type of the file. |
| onProgress(optional) | `(data: UploadProgress) => void` | Callback for upload progress updates.<br>> Note: For multipart uploads, the reported bytes may include multipart framing overhead<br>> (boundary strings, headers, form parameters) in addition to the file content. |
| parameters(optional) | `Record<string, string>` | Additional form parameters to include in multipart uploads. |
| sessionType(optional) | `NetworkTaskSessionType` | Only for:<br>iOS<br>Determines whether the iOS native session should continue in the background.<br>When set to `'background'`, the native transfer may continue after the app is<br>suspended. However, the JavaScript `UploadTask` instance is not<br>restored if the app is terminated or relaunched, so its promise, progress<br>callbacks, and cancellation state are only available while the original JS<br>runtime is still alive.<br>Default:`'background'` |
| signal(optional) | `AbortSignal` | An `AbortSignal` that can be used to cancel the upload.<br>When the signal is aborted, the upload is cancelled and the promise rejects with an `AbortError`. |
| uploadType(optional) | `UploadType` | The type of upload operation.<br>Default:`UploadType.BINARY_CONTENT` |

### `UploadProgress`

Represents upload progress data.

| Property | Type | Description |
| --- | --- | --- |
| bytesSent | `number` | The number of bytes sent so far. |
| totalBytes | `number` | The total number of bytes to send. |

### `UploadResult`

Represents the result of an upload operation.

| Property | Type | Description |
| --- | --- | --- |
| body | `string` | The response body as a string. |
| headers | `Record<string, string>` | The response headers. |
| status | `number` | The HTTP status code. |

### `UploadTaskState`

Type: `Exclude<'idle' | 'active' | 'paused' | 'completed' | 'cancelled' | 'error', 'paused'>`

Represents the current state of an upload task.

### `WatchEvent`

Describes a change detected by a file system watcher.

| Property | Type | Description |
| --- | --- | --- |
| nativeEventFlags(optional) | `number` | Raw platform-specific event flags for advanced use cases.<br>On Android: FileObserver event flags.<br>On iOS: DispatchSource.FileSystemEvent flags. |
| newTarget(optional) | `T` | Only for:<br>Android<br>For rename events, the new path after rename.<br>Populated when MOVED\_FROM and MOVED\_TO events are correlated within the debounce window. |
| target | `T` | The file or directory that changed. For `renamed` events, this is the original path before the rename. |
| type | `WatchEventType` | The kind of change that occurred. |

### `WatchEventType`

Literal type: `string`

The type of change that triggered a watcher event.

- `created` — a new file or directory was created
- `modified` — the file contents or metadata changed
- `deleted` — the file or directory was removed
- `renamed` — the file or directory was renamed or moved

Acceptable values are:`'created'` \| `'modified'` \| `'deleted'` \| `'renamed'`

### `WatchOptions`

Options for configuring a file system watcher.

| Property | Type | Description |
| --- | --- | --- |
| debounce(optional) | `number` | The debounce interval in milliseconds for coalescing rapid successive events into a single callback.<br>Default:`100` |
| events(optional) | `WatchEventType[]` | Limits which event types trigger the callback. If omitted, all event types are observed.<br>On iOS, directory watchers only provide coarse-grained notifications that the directory itself<br>changed, so filtering for child-level `created`, `deleted`, or `renamed` events is not reliable. |

### `WatchSubscription`

A handle to an active file system watcher. Call `remove()` to stop watching and release resources.

| Property | Type | Description |
| --- | --- | --- |
| remove | `() => void` | Stops watching for changes and releases native resources.<br>After calling this method, the callback will no longer be invoked. |

## Enums

### `EncodingType`

#### `Base64`

`EncodingType.Base64 ＝ "base64"`

Binary, radix-64 representation.

#### `UTF8`

`EncodingType.UTF8 ＝ "utf8"`

Standard encoding format.

### `FileMode`

Specifies the access mode when opening a file handle.

#### `ReadOnly`

`FileMode.ReadOnly ＝ "r"`

Opens the file for reading only.
The cursor is positioned at the beginning of the file.

#### `ReadWrite`

`FileMode.ReadWrite ＝ "rw"`

Opens the file for both reading and writing.
The cursor is positioned at the beginning of the file.

> Note: This mode cannot be used with SAF (Storage Access Framework) `content://` URIs.

#### `WriteOnly`

`FileMode.WriteOnly ＝ "w"`

Opens the file for writing only.
The cursor is positioned at the beginning of the file.

#### `Append`

`FileMode.Append ＝ "wa"`

Opens the file for writing only.
The cursor is positioned at the end of the file.

> Note: For SAF files, this is a strict append-only mode.
> The cursor cannot be moved; calling `seek()` will have no effect.

#### `Truncate`

`FileMode.Truncate ＝ "wt"`

Opens the file for writing only and truncates the file to zero length (wipes content).

### `UploadType`

Represents the type of upload operation.

#### `BINARY_CONTENT`

`UploadType.BINARY_CONTENT ＝ 0`

Binary content upload - the file is uploaded as-is in the request body.

#### `MULTIPART`

`UploadType.MULTIPART ＝ 1`

Multipart form upload - the file is uploaded as part of a multipart/form-data request.

We value your privacy

We use cookies to collect data and improve our services. [Learn more](https://expo.dev/privacy/cookies)

DeclineAccept

Customize