# Cloudinary implementation notes

Sources consulted on 2026-08-26:

- [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Upload guide](https://cloudinary.com/documentation/upload_images)
- [Delete assets](https://cloudinary.com/documentation/delete_assets)

The official Upload API reference states that signed requests use a SHA signature generated from the request parameters and the API secret. The signature excludes `api_key`, `cloud_name`, `resource_type`, and `file`; the request includes `api_key`, `timestamp`, and `signature`. Cloudinary explicitly warns that the API secret must never be exposed in public client-side code. The current server helper follows this canonicalization for scalar parameters and rejects an empty API secret rather than falling back to unsigned upload.

The official deletion documentation states that single-asset deletion uses the Upload API Destroy method and requires a server-generated signature. It also states that Admin API bulk deletion requires the API key and secret and is not suitable for client-side code. Deletion should request `invalidate: true` when CDN copies must be invalidated. The application still requires supplied Cloudinary configuration and a real upload/delete verification before Media acceptance can be marked complete.
