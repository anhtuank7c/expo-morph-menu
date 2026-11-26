import { FlatList, Platform, type FlatListProps, type ListRenderItem } from 'react-native';

import type { Post } from '../../../core/api/dto';
import { Separator } from '../../../shared/ui/Separator';
import { PostCard } from './PostCard';

/**
 * A FlatList of posts, used by the feed, the replies of a post and profiles.
 *
 * `renderItem` and `keyExtractor` are module-level functions, so the list
 * receives the same props on every render of its parent and only the rows
 * whose post changed render again.
 */
const renderPost: ListRenderItem<Post> = ({ item }) => <PostCard post={item} />;
const keyOf = (post: Post) => post.id;

type Props = Omit<FlatListProps<Post>, 'renderItem' | 'keyExtractor' | 'data'> & { posts: readonly Post[] };

export function PostList({ posts, ...rest }: Props) {
  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyOf}
      ItemSeparatorComponent={Separator}
      // Rows have variable heights (media, polls), so there is no getItemLayout.
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      {...rest}
    />
  );
}
