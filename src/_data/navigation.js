export default {
  // The post-type mega-menu (the main nav). Each entry:
  //   text       — visible name
  //   url        — section archive URL
  //   icon       — lucide glyph in src/assets/svg/posts/ (swap = one-word edit)
  //   collection — Eleventy collection key, used for the per-type count
  // NB: Jam is asymmetric — URL /jams/ but collection key `jam` (see collections.js).
  // Order here is the reading order shown in the panel, not the POST_TYPES order.
  postTypes: [
    {text: 'Articles', url: '/articles/', icon: 'newspaper', collection: 'article'},
    {text: 'Notes', url: '/notes/', icon: 'pencil', collection: 'note'},
    {text: 'Reading', url: '/reading/', icon: 'book-open', collection: 'reading'},
    {text: 'Watching', url: '/watching/', icon: 'film', collection: 'watching'},
    {text: 'Jams', url: '/jams/', icon: 'music', collection: 'jam'},
    {text: 'Photos', url: '/photos/', icon: 'camera', collection: 'photo'},
    {text: 'Recipes', url: '/recipes/', icon: 'chef-hat', collection: 'recipe'},
    {text: 'Events', url: '/events/', icon: 'calendar', collection: 'event'},
    {text: 'Bookmarks', url: '/bookmarks/', icon: 'bookmark', collection: 'bookmark'},
    {text: 'Replies', url: '/replies/', icon: 'reply', collection: 'reply'},
    {text: 'Reposts', url: '/reposts/', icon: 'repeat-2', collection: 'repost'},
    {text: 'Likes', url: '/likes/', icon: 'heart', collection: 'like'},
    {text: 'RSVPs', url: '/rsvps/', icon: 'calendar-check', collection: 'rsvp'},
    {text: 'Audio', url: '/audio/', icon: 'mic', collection: 'audio'},
    {text: 'Videos', url: '/videos/', icon: 'video', collection: 'video'}
  ],
  // Footer nav. About lives here now (moved out of the top nav); Now joins it once
  // the page exists.
  bottom: [
    {
      text: 'About',
      url: '/about/'
    },
    {
      text: 'Training',
      url: '/training/'
    },
    {
      text: 'Imprint',
      url: '/imprint/'
    },
    {
      text: 'Privacy',
      url: '/privacy/'
    },
    {
      text: 'Accessibility',
      url: '/accessibility/'
    }
  ]
};
