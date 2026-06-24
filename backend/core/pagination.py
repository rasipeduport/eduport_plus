"""
Opt-in, backward-compatible pagination.

Endpoints call ``paginate_queryset``: when the request carries a ``page`` query
param the queryset is sliced and an envelope of metadata is returned; otherwise
nothing is paginated and the view keeps its original (unwrapped) response shape.
This lets large lists scale without breaking existing clients that expect the
full collection.
"""

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 200


def paginate_queryset(request, queryset, default_page_size=DEFAULT_PAGE_SIZE):
    """
    Returns ``(items, meta)``:
      - if ``?page=`` is absent -> ``(None, None)`` (caller uses the full queryset)
      - otherwise -> ``(sliced_queryset, {count, page, page_size})``

    The queryset must already be ordered for stable slicing.
    """
    if request.query_params.get('page') is None:
        return None, None

    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        page = 1

    raw_size = request.query_params.get('page_size') or request.query_params.get('pageSize') or default_page_size
    try:
        page_size = min(MAX_PAGE_SIZE, max(1, int(raw_size)))
    except (ValueError, TypeError):
        page_size = default_page_size

    total = queryset.count()
    offset = (page - 1) * page_size
    items = queryset[offset:offset + page_size]
    meta = {"count": total, "page": page, "page_size": page_size}
    return items, meta
