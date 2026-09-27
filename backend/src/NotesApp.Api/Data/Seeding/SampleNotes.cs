namespace NotesApp.Api.Data.Seeding;

public sealed record SampleNote(string Title, string Content);

public static class SampleNotes
{
    // Content must match the Milkdown serialization; otherwise, opening a note rewrites it and triggers an autosave.
    public static IReadOnlyList<SampleNote> All { get; } =
    [
        new(
            "Markdownの拡張記法",
            """
            標準のMarkdownにはないこのアプリで使える記法。

            | 要素      | 入力                            |
            | :------ | :---------------------------- |
            | 表       | 行頭で `\|列数x行数\|` のあとにスペース      |
            | 取り消し線   | `~~` で囲む                      |
            | チェックリスト | 行頭で `- [ ]` のあとにスペース          |
            | 数式      | `$` で囲む、または行頭で `$$` のあとにEnter |

            ## 表

            行頭で `|2x5|` を入力してスペースを押すと、上記のように2列×5行（見出し行を含む）の表になる。

            ## 取り消し線

            `~~` で囲むと ~~このように~~ 線が引かれる。

            ## チェックリスト

            行頭で `- [ ]` のあとにスペースを入力するとチェックリストになる。`- [x]` にすると完了の状態になる。

            * [x] チェックリストを作る
            * [ ] 数式を書く

            ## 数式

            `$...$` で囲むと本文中に $e^{i\pi} + 1 = 0$ のような数式を書ける。行頭で `$$` を入力してEnterを押すと数式ブロックになる。

            $$
            \sum_{k=1}^{n} k = \frac{n(n+1)}{2}
            $$


            """),
        new(
            "reset・revert・restoreの使い分け",
            """
            | コマンド                          | 対象       | 履歴           | 作業ツリーの変更   |
            | ----------------------------- | -------- | ------------ | ---------- |
            | `git restore <file>`          | 作業ツリー    | 変わらない        | 捨てる        |
            | `git restore --staged <file>` | ステージ     | 変わらない        | 残る         |
            | `git reset --soft HEAD~1`     | 直前のコミット  | 消える          | 残る（ステージ済み） |
            | `git reset HEAD~1`            | 直前のコミット  | 消える          | 残る（未ステージ）  |
            | `git reset --hard HEAD~1`     | 直前のコミット  | 消える          | **消える**    |
            | `git revert <commit>`         | 指定したコミット | 打ち消すコミットが増える | 変わらない      |

            > push済みのコミットはresetせず、revertで打ち消す。resetで履歴を書き換えると、他の人の履歴と食い違う。

            ```bash
            git reflog                  # HEADが指していた場所の履歴
            git reset --hard HEAD@{2}   # 2つ前の状態に戻す
            ```

            * `reset --hard`で消したコミットも、しばらくはreflogから戻せる。ただし、コミットしていない変更は戻せない
            * 自信がないときは、先に`git branch backup`で今の位置を残しておく


            """),
        new(
            "rebaseとforce-with-lease",
            """
            ```bash
            git switch feature/search
            git fetch origin
            git rebase origin/main
            # 衝突を解決したら
            git add <file>
            git rebase --continue   # 中止するなら git rebase --abort
            git push --force-with-lease
            ```

            | 項目           | `--force` | `--force-with-lease` |
            | ------------ | --------- | -------------------- |
            | 他の人がpushした変更 | 上書きして消す   | 検出して失敗する             |

            * rebaseはコミットを作り直すので、コミットIDが変わる
            * 他の人も使っているブランチ（mainなど）はrebaseしない
            * `--force-with-lease`は、リモート追跡ブランチ（`origin/xxx`）と比べて判定する。push直前に`git fetch`すると、他の人の変更を取り込んだ扱いになり、保護が効かなくなる


            """),
        new(
            "npm ciとnpm installの違い",
            """
            | 項目                | `npm install` | `npm ci`                      |
            | ----------------- | ------------- | ----------------------------- |
            | package-lock.json | 必要なら書き換える     | 書き換えない（package.jsonと食い違うとエラー） |
            | node\_modules     | 差分だけ入れる       | 削除してから入れ直す                    |
            | 使う場面              | パッケージの追加・更新   | CI、クローンした直後                   |

            ```bash
            npm install zod          # dependencies に追加
            npm install -D vitest    # devDependencies に追加
            npm ci
            npm run check            # package.json の scripts を実行
            ```

            * package-lock.jsonは必ずコミットする。CIでは`npm ci`で、ロックファイルどおりのバージョンを入れる
            * `npx <command>`は`node_modules/.bin`のコマンドを実行する。見つからなければダウンロードして実行するので、打ち間違いに注意
            * Node.jsのバージョンは`.nvmrc`で固定して、開発者とCIでそろえる


            """),
        new(
            "Dockerfileのレイヤーキャッシュ",
            """
            ```dockerfile
            FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
            WORKDIR /src

            # 依存関係の定義だけを先にコピーして restore する
            COPY src/NotesApp.Api/NotesApp.Api.csproj src/NotesApp.Api/
            RUN dotnet restore src/NotesApp.Api/NotesApp.Api.csproj

            # ソースコードは後からコピーする
            COPY . .
            RUN dotnet publish src/NotesApp.Api/NotesApp.Api.csproj -c Release -o /app/publish --no-restore

            FROM mcr.microsoft.com/dotnet/aspnet:10.0
            WORKDIR /app
            COPY --from=build /app/publish .
            USER app
            ENTRYPOINT ["dotnet", "NotesApp.Api.dll"]
            ```

            * 命令ごとにレイヤーが作られ、変更があった命令から後ろはすべて作り直しになる
            * 先に`COPY . .`すると、コードを1行変えただけで`restore`からやり直しになる
            * `.dockerignore`で`bin/`・`obj/`・`node_modules/`を除外する。除外しないとキャッシュが効きにくく、ビルドコンテキストも大きくなる
            * マルチステージビルドで、最終イメージにはSDKを含めない


            """),
        new(
            "Composeのボリュームとdown -v",
            """
            | コマンド                     | コンテナ   | ネットワーク | 名前付きボリューム |
            | ------------------------ | ------ | ------ | --------- |
            | `docker compose stop`    | 停止（残る） | 残る     | 残る        |
            | `docker compose down`    | 削除     | 削除     | 残る        |
            | `docker compose down -v` | 削除     | 削除     | **削除**    |

            > `down -v`はDBのデータも消える。大事なデータが入ったボリュームでは使わない。

            ```bash
            docker volume ls
            docker compose -p notes-demo down -v   # notes-demo プロジェクトのボリュームだけ消す
            ```

            * ボリューム名は「プロジェクト名\_ボリューム名」になる（例：`notes-app_db_data`）
            * `-p`でプロジェクト名を変えると、別のボリュームが作られる
            * tmpfsはメモリ上に置くので、コンテナを止めると消える。使い捨てのテスト用DB向き


            """),
        new(
            "async/awaitの落とし穴",
            """
            ```csharp
            // NG: 完了するまでスレッドをブロックする
            Note note = dbContext.Notes.FirstAsync(cancellationToken).Result;

            // OK
            Note note = await dbContext.Notes.FirstAsync(cancellationToken);
            ```

            | NG                     | 問題                            | 代わりに                       |
            | ---------------------- | ----------------------------- | -------------------------- |
            | `.Result` / `.Wait()`  | スレッドをブロックする。UIアプリなどではデッドロックする | `await`                    |
            | `async void`           | 例外を呼び出し元で捕まえられない              | `async Task`（イベントハンドラーは例外） |
            | `await`せずに呼ぶ           | 例外が見えなくなる                     | 必ず`await`する                |
            | CancellationTokenを渡さない | 切断されたリクエストの処理が続く              | 受け取って最後まで渡す                |

            * Minimal APIsでは、ハンドラーの引数に`CancellationToken`を書くと、リクエストの中止と連動したトークンを受け取れる
            * 1つのDbContextで複数のクエリを同時に実行できない。`Task.WhenAll`で並べない


            """),
        new(
            "DIのライフタイムとキャプティブ依存",
            """
            | ライフタイム    | インスタンス       | 例              |
            | --------- | ------------ | -------------- |
            | Singleton | アプリ全体で1つ     | `TimeProvider` |
            | Scoped    | リクエストごとに1つ   | `DbContext`    |
            | Transient | 取得するたびに新しく作る | 状態を持たない軽いサービス  |

            ### キャプティブ依存

            SingletonのサービスにScopedのサービスを注入すると、Scopedのはずのインスタンスがアプリが終わるまで使い回される。これを*キャプティブ依存*という。

            ```csharp
            // NG: Singleton の NoteCache がコンストラクターで AppDbContext を受け取っている
            builder.Services.AddSingleton<NoteCache>();

            // OK: 必要なときにスコープを作る
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            ```

            * DbContextはスレッドセーフではないので、使い回すと同時アクセスで壊れる
            * Development環境ではスコープの検証が有効で、起動時にエラーになる。本番環境では検出されない


            """),
        new(
            "構成の優先順位と環境変数",
            """
            後から読み込まれたものほど優先される。

            1. `appsettings.json`
            2. `appsettings.{Environment}.json`
            3. ユーザーシークレット（Development環境のみ）
            4. 環境変数
            5. コマンドライン引数

            ```json
            {
              "ConnectionStrings": {
                "AppDatabase": "Host=localhost;Port=5432;Database=notes_app"
              }
            }
            ```

            ```bash
            # 環境変数では、JSONの階層を __ で区切る
            export ConnectionStrings__AppDatabase="Host=db;Port=5432;Database=notes_app"
            ```

            * `ASPNETCORE_ENVIRONMENT`で読み込む`appsettings.{Environment}.json`が変わる。未設定ならProduction
            * 秘密情報は`appsettings.json`に書かない。`.env`は`.gitignore`に入れ、`.env.example`だけをコミットする
            * 詳しくは[ASP.NET Coreの構成](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/)を参照


            """),
        new(
            "ミドルウェアの順序",
            """
            ```csharp
            app.UseExceptionHandler();
            app.UseSerilogRequestLogging();
            app.UseCors();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapNoteEndpoints();
            ```

            > 順番を間違えてもコンパイルエラーにはならない。何も起きないか、セキュリティの穴になる。

            * リクエストは上から順に通り、レスポンスは逆の順に戻る
            * 例外ハンドラーは先頭に置く。後ろで起きた例外をまとめて受け止める
            * CORSは認証より前に置く。プリフライトのリクエストは認証情報を持たないため
            * `UseAuthentication`（誰か）は`UseAuthorization`（何をしてよいか）より前に置く
            * 認可が必要なエンドポイントに`RequireAuthorization()`を付け忘れると、誰でも呼べてしまう


            """),
        new(
            "HTTPステータスコードの使い分け",
            """
            | コード                       | 意味          | 例                        |
            | ------------------------- | ----------- | ------------------------ |
            | 200 OK                    | 成功          | 取得、更新                    |
            | 201 Created               | 作成した        | POST（`Location`ヘッダーを付ける） |
            | 204 No Content            | 成功し、返す本文がない | DELETE                   |
            | 400 Bad Request           | リクエストが不正    | JSONが壊れている、検証エラー         |
            | 401 Unauthorized          | 認証されていない    | ログインしていない                |
            | 403 Forbidden             | 権限がない       | 管理者専用の操作                 |
            | 404 Not Found             | 見つからない      | 存在しないID                  |
            | 409 Conflict              | 今の状態と競合する   | 同時更新、重複登録                |
            | 500 Internal Server Error | サーバーの不具合    | 想定外の例外                   |

            ***

            * 401は「認証」、403は「認可」の失敗。401の名前は「Unauthorized」だが、意味は「認証されていない」
            * 検証エラーを400と422のどちらで返すかは流儀による。ASP.NET Coreの`ValidationProblem`は既定で400
            * 他人のリソースは、存在を知られたくなければ403ではなく404を返す
            * エラーの本文は[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)のProblem Detailsにそろえる

            ```json
            {
              "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
              "title": "Not Found",
              "status": 404
            }
            ```


            """),
        new(
            "EF Coreの変更追跡とAsNoTracking",
            """
            ```csharp
            // 読み取りだけ：追跡しない
            List<Note> notes = await dbContext.Notes
                .AsNoTracking()
                .OrderByDescending(note => note.UpdatedAt)
                .ToListAsync(cancellationToken);

            // 更新：追跡されているエンティティを変更して保存する
            Note? note = await dbContext.Notes.FindAsync([id], cancellationToken);
            if (note is null)
            {
                return TypedResults.NotFound();
            }
            note.Update(title, content, timeProvider.GetUtcNow());
            await dbContext.SaveChangesAsync(cancellationToken);   // 変わった列だけ UPDATE される
            ```

            * `SaveChanges`は、追跡中のエンティティの変更を検出してSQLにする。`dbContext.Update()`を呼ぶ必要はない
            * `AsNoTracking`で取得したエンティティを変更しても保存されない
            * `ExecuteUpdateAsync`・`ExecuteDeleteAsync`は、読み込まずに1つのSQLで実行する。追跡中のエンティティには反映されない
            * DbContextはリクエストごと（Scoped）に使い捨てる


            """),
        new(
            "マイグレーション適用前のチェック",
            """
            ```bash
            cd backend
            dotnet ef migrations add AddTags --project src/NotesApp.Api
            dotnet ef migrations script --idempotent --output migrate.sql --project src/NotesApp.Api
            dotnet ef database update --project src/NotesApp.Api
            ```

            ## 適用する前に

            * [ ] 生成されたマイグレーションのコードを読んだ
            * [ ] 列の名前変更が、削除と追加（`DropColumn`と`AddColumn`）になっていない
            * [ ] NOT NULLの列を追加するとき、既存の行に入る値を決めた
            * [ ] 生成されたSQLを確認した
            * [ ] DBのバックアップを取った

            > 列やプロパティの名前を変えると、EF Coreは「削除して追加」と判断することがある。そのまま適用すると、その列のデータが消える。

            * `migrations remove`は、DBに適用済みのマイグレーションでは失敗する。先に`database update <1つ前の名前>`で戻す
            * 他の環境に適用済みのマイグレーションは消さず、打ち消すマイグレーションを追加する


            """),
        new(
            "LIKE検索のエスケープとインデックス",
            """
            部分一致検索は書くのは簡単だが、エスケープとインデックスで間違えやすい。

            $$
            \text{全件走査}: O(n) \qquad \text{B-treeインデックス}: O(\log n)
            $$

            | 検索パターン                     | B-treeインデックス                  | pg\_trgm（GIN） |
            | -------------------------- | ----------------------------- | ------------- |
            | `LIKE 'abc%'`（前方一致）        | 使える（`text_pattern_ops`かC照合順序） | 使える           |
            | `LIKE '%abc%'`（部分一致）       | 使えない（全件走査）                    | 使える           |
            | `ILIKE '%abc%'`（大文字小文字を無視） | 使えない（全件走査）                    | 使える           |

            > ユーザーが入力した`%`や`_`は、エスケープしないとワイルドカードとして扱われる。「100%」で検索すると、「100」を含むすべてのノートが一致してしまう。

            ```csharp
            private static string EscapeLikeSpecialChars(string value)
            {
                return value
                    .Replace("\\", "\\\\", StringComparison.Ordinal)   // エスケープ文字を最初に
                    .Replace("%", "\\%", StringComparison.Ordinal)
                    .Replace("_", "\\_", StringComparison.Ordinal);
            }

            string pattern = $"%{EscapeLikeSpecialChars(query)}%";
            notes = notes.Where(note => EF.Functions.ILike(note.Title, pattern, "\\"));
            ```

            ```sql
            CREATE EXTENSION IF NOT EXISTS pg_trgm;
            CREATE INDEX ix_notes_title_trgm ON notes USING gin (title gin_trgm_ops);
            ```

            * エスケープ文字（`\`）そのものを最初にエスケープする。順番を逆にすると、付け足した`\`まで二重にエスケープされる
            * パラメーター化されているのでSQLインジェクションにはならない。ワイルドカードの問題はそれとは別
            * 件数が少ないうちは全件走査で十分。遅くなったら`EXPLAIN ANALYZE`で確かめてからインデックスを足す


            """),
        new(
            "useEffectの依存配列とクリーンアップ",
            """
            | 依存配列   | 実行されるタイミング         |
            | ------ | ------------------ |
            | 書かない   | レンダリングのたび          |
            | `[]`   | マウント時の1回だけ         |
            | `[id]` | マウント時と、`id`が変わったとき |

            ```tsx
            useEffect(() => {
              let ignore = false;
              fetchNote(id).then((note) => {
                if (!ignore) {
                  setNote(note);
                }
              });
              return () => {
                ignore = true;   // 古いリクエストの結果を捨てる
              };
            }, [id]);
            ```

            * 依存の書き漏れは、古い値を参照するバグになる。ESLintの`react-hooks/exhaustive-deps`の警告に従う
            * 開発環境のStrict Modeでは、マウント → クリーンアップ → マウントと2回実行される。クリーンアップ漏れを見つけるための仕様
            * 依存にオブジェクトや関数を入れると、レンダリングのたびに別物になり、毎回実行されることがある
            * データの取得は、実際にはTanStack Queryに任せる


            """),
        new(
            "keyにインデックスを使わない理由",
            """
            ```tsx
            // NG: 削除や並び替えで、入力中の状態が別の行にずれる
            {notes.map((note, index) => <NoteRow key={index} note={note} />)}

            // OK: 変わらない一意な値を使う
            {notes.map((note) => <NoteRow key={note.id} note={note} />)}
            ```

            * Reactはkeyで、レンダリングの前後で同じ要素かどうかを判定する。インデックスだと、先頭を削除したときにすべての行が「別の中身に変わった」と判断される
            * `Math.random()`など毎回変わる値もNG。レンダリングのたびに作り直される
            * keyを変えるとコンポーネントが作り直されるので、状態のリセットに使える（例：`<NoteEditor key={note.id} />`）
            * 並び替えも追加・削除もしない固定のリストなら、インデックスでも問題ない


            """),
        new(
            "TanStack QueryのstaleTimeとgcTime",
            """
            | 項目   | staleTime       | gcTime             |
            | ---- | --------------- | ------------------ |
            | 意味   | データを「新しい」とみなす時間 | 使われなくなったキャッシュを残す時間 |
            | 既定値  | 0（すぐ古くなる）       | 5分                 |
            | 過ぎると | 次のきっかけで再取得する    | キャッシュを削除する         |

            ```tsx
            const queryClient = new QueryClient({
              defaultOptions: {
                queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
              },
            });

            // 更新したら、詳細は書き換え、一覧は取り直す
            queryClient.setQueryData(noteKeys.detail(note.id), note);
            void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
            ```

            * staleTimeが0だと、マウントやウィンドウのフォーカスのたびに再取得する
            * 古くなってもキャッシュはすぐ表示され、裏で再取得される
            * クエリキーを`["notes", "list", query]`のように階層にしておくと、`["notes", "list"]`でまとめて無効化できる
            * `gcTime`は、v4までの`cacheTime`から名前が変わったもの


            """),
        new(
            "unknownと型の絞り込み",
            """
            | 型         | 何でも代入できる | そのまま使える         |
            | --------- | -------- | --------------- |
            | `any`     | できる      | できる（型チェックが効かない） |
            | `unknown` | できる      | できない（絞り込んでから使う） |

            ```ts
            function getErrorMessage(error: unknown): string {
              if (error instanceof Error) {
                return error.message;
              }
              if (typeof error === "string") {
                return error;
              }
              return "不明なエラーが発生しました。";
            }

            type SaveState =
              | { status: "idle" }
              | { status: "saving" }
              | { status: "error"; error: unknown };

            function getLabel(state: SaveState): string {
              switch (state.status) {
                case "idle":
                  return "保存済み";
                case "saving":
                  return "保存中…";
                case "error":
                  return getErrorMessage(state.error);
              }
            }
            ```

            * `catch (error)`の`error`は、`strict`では`unknown`になる。`any`として扱わない
            * `as`は値を変換しない。コンパイラーに「この型だ」と言い張るだけなので、間違っていても実行時まで分からない
            * APIのレスポンスのような外部から来るデータは、型を付けただけでは保証されない。必要ならZodで検証する


            """),
        new(
            "ページングの並び順を安定させる",
            """
            ```csharp
            List<Note> items = await notes
                .OrderByDescending(note => note.UpdatedAt)
                .ThenByDescending(note => note.Id)   // 同じ日時でも順番が一意に決まる
                .Skip(offset)
                .Take(limit + 1)                     // 1件多く取る
                .ToListAsync(cancellationToken);

            bool hasMore = items.Count > limit;
            ```

            * ORDER BYの値が同じ行の順番は保証されない。ページをまたいで重複や欠落が起きるので、最後に一意な列（ID）を加える
            * 1件多く取れば、COUNTのクエリを使わずに次のページの有無が分かる
            * 並べ替えに使う列には、同じ並びの複合インデックスを張る（`(updated_at DESC, id DESC)`）

            | 項目           | オフセット方式              | キーセット方式                                 |
            | ------------ | -------------------- | --------------------------------------- |
            | 指定のしかた       | `OFFSET 40 LIMIT 20` | `WHERE (updated_at, id) < (前のページの最後の値)` |
            | 後ろのページ       | 遅くなる                 | 速い                                      |
            | 任意のページへ移動    | できる                  | できない                                    |
            | 途中で追加・更新されると | ずれる                  | ずれにくい                                   |

            オフセット方式は、飛ばす行も読むので $O(\text{offset} + \text{limit})$ かかる。
            """),
        new(
            "テストの3層と使い分け",
            """
            | 層   | 対象          | 速さ   | 例                                      |
            | --- | ----------- | ---- | -------------------------------------- |
            | 単体  | 関数・クラス単体    | 速い   | xUnit、Vitest                           |
            | 結合  | 複数の部品の組み合わせ | 中くらい | Testcontainers＋API、Testing Library＋MSW |
            | E2E | ブラウザからアプリ全体 | 遅い   | Playwright＋axe                         |

            * 細かい条件分岐は単体テスト、部品のつなぎ目は結合テスト、重要な操作の流れだけをE2Eで確かめる
            * E2Eを増やしすぎると、遅く不安定になる
            * 実装の詳細ではなく、外から見た振る舞いをテストする。リファクタリングで壊れるテストは、実装に依存しすぎている
            * 遅いテストはカテゴリで分けて、普段は速いテストだけを回す

            ```bash
            dotnet test --filter "Category!=Integration"
            ```


            """),
        new(
            "ローカルで通るのにCIで落ちる",
            """
            | 原因                        | 対策                                                         |
            | ------------------------- | ---------------------------------------------------------- |
            | package.jsonとロックファイルの食い違い | ローカルでも`npm ci`で試す                                          |
            | フォーマット・lintの違反            | `dotnet format --verify-no-changes`、`npm run check`を先に実行する |
            | 生成ファイルのコミット漏れ             | 生成し直して`git diff`で確かめる                                      |
            | `.env`などのコミットしないファイルに依存   | CIで`.env.example`からコピーする                                   |
            | ファイル名の大文字小文字              | importのパスを実際のファイル名とそろえる                                    |
            | タイムゾーン・ロケール               | 時刻はUTCで扱い、テストでは固定する                                        |
            | 追加し忘れたファイル                | `git status`で未追跡のファイルを確認する                                 |

            > WindowsやmacOSは、既定ではファイル名の大文字小文字を区別しない。`import "./noteList"`と書いても`NoteList.tsx`が読み込めてしまい、LinuxのCIでだけ失敗する。

            * CIのログは、最初に失敗したステップから読む。後ろのエラーは連鎖していることが多い
            * 失敗したE2Eのレポートやスクリーンショットは、アーティファクトとして保存しておく


            """),
        new(
            "git stashの使いどころ",
            """
            ```bash
            git stash push -u -m "wip: 検索UI"   # -u で未追跡のファイルも退避
            git stash list
            git stash show -p stash@{0}         # 中身を確認
            git stash pop                       # 適用して削除
            ```

            * `-u`を付けないと、新しく作ったファイルは退避されずに残る
            * `pop`は適用して削除、`apply`は適用して残す
            * `pop`で衝突すると、stashは削除されずに残る。解決したら`git stash drop`で消す
            * stashは溜まると中身が分からなくなる。長く置くなら`git stash branch <name>`でブランチにする


            """),
        new(
            "git bisectで原因を探す",
            """
            1. `git bisect start`で開始する
            2. 今のコミットを`git bisect bad`、動いていたコミットを`git bisect good v1.0.0`のように指定する
            3. Gitが切り替えたコミットを確かめ、`good`か`bad`を答える。原因のコミットが見つかるまで繰り返す
            4. `git bisect reset`で元のブランチに戻る

            ```bash
            git bisect start
            git bisect bad
            git bisect good v1.0.0
            git bisect run npm test   # テストの終了コードで good / bad を自動判定
            git bisect reset
            ```

            * 二分探索なので、$N$ 個のコミットでも約 $\log_2 N$ 回で見つかる。1000コミットなら約10回
            * `bisect run`では、終了コード0がgood、125がスキップ、それ以外の1〜127がbadになる


            """),
        new(
            "追跡済みファイルを.gitignoreする",
            """
            ```bash
            echo ".env" >> .gitignore
            git rm --cached .env      # 追跡をやめる（ファイルは手元に残る）
            git commit -m "Stop tracking .env"
            git check-ignore -v .env  # どのルールで無視されているか確認
            ```

            > 一度コミットした秘密情報は履歴に残る。.gitignoreに追加しても消えない。パスワードやキーは無効にして作り直す。

            * `.gitignore`は、まだ追跡していないファイルにだけ効く
            * `!.env.example`のような否定パターンで例外を作れる
            * 空のディレクトリはGitで管理できない。残したいときは`.gitkeep`などのファイルを置く


            """),
        new(
            "PowerShellとbashの書き方の違い",
            """
            | やりたいこと      | bash                 | PowerShell                        |
            | ----------- | -------------------- | --------------------------------- |
            | 環境変数を設定     | `export NAME=value`  | `$env:NAME = "value"`             |
            | そのコマンドだけに設定 | `NAME=value command` | 書き方がない（設定してから実行）                  |
            | 成功したら次を実行   | `a && b`             | `a; if ($?) { b }`（7以降は`&&`も可）    |
            | 日付の文字列      | `$(date +%Y%m%d)`    | `$(Get-Date -Format yyyyMMdd)`    |
            | 強制的に再帰削除    | `rm -rf dir`         | `Remove-Item -Recurse -Force dir` |

            ```powershell
            $env:SEED_SAMPLE_DATA = "true"
            docker compose -p notes-demo up --build
            Remove-Item Env:SEED_SAMPLE_DATA
            ```

            * Windows PowerShell 5.1では、`curl`は`Invoke-WebRequest`の別名。本物のcurlは`curl.exe`と書く
            * `$env:`で設定した環境変数は、そのセッションが終わるまで残る
            * Windows PowerShell 5.1の`Set-Content`は、既定ではUTF-8で書き込まない。`-Encoding utf8`を付ける


            """),
        new(
            "コンテナからlocalhostにつながらない",
            """
            | 接続元 → 接続先   | 使うホスト名                 |
            | ----------- | ---------------------- |
            | ホスト → コンテナ  | `localhost:公開したポート`    |
            | コンテナ → コンテナ | サービス名（`db:5432`）       |
            | コンテナ → ホスト  | `host.docker.internal` |

            ```yaml
            services:
              db:
                ports:
                  - "127.0.0.1:5432:5432"   # ホスト側:コンテナ側
              api:
                environment:
                  ConnectionStrings__AppDatabase: Host=db;Port=5432;Database=notes_app
            ```

            * コンテナの中の`localhost`は、そのコンテナ自身を指す
            * コンテナ同士は、`ports`で公開しなくても同じネットワーク内で通信できる。そのときはコンテナ側のポートを使う
            * `127.0.0.1:5432:5432`と書くと、ホストの外からは接続できない
            * コンテナの中のアプリが`127.0.0.1`だけで待ち受けていると、外から接続できない。`0.0.0.0`で待ち受ける
            * `host.docker.internal`はDocker Desktopで使える。Linuxでは`extra_hosts`に`host-gateway`を指定する


            """),
        new(
            "depends_onとヘルスチェック",
            """
            ```yaml
            services:
              db:
                image: postgres:18
                healthcheck:
                  test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
                  interval: 5s
                  retries: 5
              api:
                depends_on:
                  db:
                    condition: service_healthy
            ```

            * `depends_on`だけでは、コンテナが起動するまでしか待たない。DBが接続を受け付けるまでは待たない
            * `condition: service_healthy`で、ヘルスチェックが成功するまで待つ
            * `$$`は、Composeの変数展開を避けるためのエスケープ
            * `docker compose up -d --wait`は、healthyになるまで待ってから終わる。CIで使いやすい
            * アプリ側も`/health/live`（プロセスが動いているか）と`/health/ready`（DBにつながるか）を分けておく


            """),
        new(
            "null許容参照型と!演算子",
            """
            ```csharp
            string? title = request.Title;   // null かもしれない

            int a = title.Length;            // 警告 CS8602
            int b = title!.Length;           // 警告は消えるが、null なら実行時に例外

            if (title is null)
            {
                return TypedResults.BadRequest();
            }
            int c = title.Length;            // 絞り込んだ後なので警告なし
            ```

            * `?`は実行時の型を変えない。コンパイラーの静的解析のための注釈
            * `!`（null免除演算子）は「nullではない」とコンパイラーに伝えるだけで、確認はしない
            * 引数は`ArgumentNullException.ThrowIfNull(value)`で検証する
            * `TreatWarningsAsErrors`を有効にすると、null関連の警告を見逃さない


            """),
        new(
            "recordとclassの使い分け",
            """
            | 項目      | class         | record            |
            | ------- | ------------- | ----------------- |
            | 等価性     | 参照（同じインスタンスか） | 値（すべてのプロパティが等しいか） |
            | 変更      | 自由            | `with`でコピーして変える   |
            | 向いている用途 | エンティティ、サービス   | DTO、値オブジェクト       |

            ```csharp
            public sealed record SaveNoteRequest(string Title, string Content);

            SaveNoteRequest a = new("タイトル", "本文");
            SaveNoteRequest b = a with { Content = "新しい本文" };   // a は変わらない

            Console.WriteLine(a == new SaveNoteRequest("タイトル", "本文"));   // True
            ```

            * 位置指定のrecordのプロパティは`init`なので、作成後に代入できない
            * 中身が`List<T>`などのとき、リストの中身は変更できる（浅い不変）。等価性もリストの参照で比べる
            * EF Coreのエンティティにはclassを使う。変更追跡はインスタンスの参照で行うため


            """),
        new(
            "Serilogのメッセージテンプレート",
            """
            ```csharp
            // NG: 文字列補間。ただの文字列になり、値で検索・集計できない
            logger.LogInformation($"Note {noteId} updated in {elapsed} ms");

            // OK: NoteId と Elapsed がプロパティとして記録される
            logger.LogInformation("Note {NoteId} updated in {Elapsed} ms", noteId, elapsed);
            ```

            * プレースホルダーと引数は、名前ではなく順番で対応する
            * 文字列補間は、ログが出力されないレベルでも文字列を組み立てるので無駄になる
            * アナライザーの警告CA2254（テンプレートは定数にする）でも検出できる
            * `{@Draft}`のように`@`を付けると、オブジェクトを分解して記録する。パスワードなどを含むオブジェクトには使わない
            * `UseSerilogRequestLogging`で、リクエストごとのログを1行にまとめられる


            """),
        new(
            "入力検証とエンティティの検証の分担",
            """
            | 項目     | FluentValidation  | エンティティ              |
            | ------ | ----------------- | ------------------- |
            | 目的     | 利用者に分かりやすいエラーを返す  | 不正な状態のオブジェクトを作らせない  |
            | 失敗したとき | 400とフィールドごとのメッセージ | 例外（プログラムの誤り）        |
            | 例      | タイトルは100文字以内      | `Note.Create`で長さを検証 |

            ```csharp
            public sealed class SaveNoteRequestValidator : AbstractValidator<SaveNoteRequest>
            {
                public SaveNoteRequestValidator()
                {
                    RuleFor(request => request.Title).NotNull().MaximumLength(Note.MaxTitleLength);
                }
            }
            ```

            * 同じルールが2か所にあるのは、役割が違うので重複ではない
            * 上限値は定数（`Note.MaxTitleLength`）を共有して、食い違わないようにする
            * 前後の空白を除いてから数えるかなど、細かい条件も両方でそろえる


            """),
        new(
            "CORSと開発サーバーのプロキシ",
            """
            オリジン＝スキーム＋ホスト＋ポート。`http://localhost:5173`と`http://localhost:5000`は別のオリジンになる。

            ```ts
            // vite.config.ts
            server: {
              proxy: {
                "/api": "http://127.0.0.1:5000",
              },
            },
            ```

            ```nginx
            location /api/ {
                proxy_pass http://api:8080;
            }
            ```

            * 開発ではVite、本番ではnginxが`/api`を転送すれば、ブラウザからは同じオリジンに見えるのでCORSの設定が要らない
            * CORSはブラウザの仕組み。curlやサーバー同士の通信には関係ない
            * ブラウザが止めるのはレスポンスの読み取り。単純なリクエストは、サーバーに届いて処理されていることがある
            * `Content-Type: application/json`や独自のヘッダーがあると、先にプリフライト（OPTIONS）が送られる
            * `AllowAnyOrigin`と資格情報（Cookie）は同時に使えない


            """),
        new(
            "日時はtimestamptzとDateTimeOffsetで",
            """
            | PostgreSQLの型  | 意味                      |
            | ------------- | ----------------------- |
            | `timestamp`   | タイムゾーンなし。どこの時刻か分からない    |
            | `timestamptz` | UTCに変換して保存し、取り出すときに変換する |

            ```csharp
            DateTimeOffset now = timeProvider.GetUtcNow();   // オフセット0（UTC）
            ```

            ```ts
            new Date(note.updatedAt).toLocaleString("ja-JP");   // 表示するときにローカル時刻へ
            ```

            * `timestamptz`は「タイムゾーンを一緒に保存する」型ではない。UTCで保存し、元のタイムゾーンは残らない
            * Npgsql 6以降、`timestamptz`に書き込めるのはUTCの値だけ。`DateTime`なら`Kind=Utc`、`DateTimeOffset`ならオフセット0
            * サーバーではUTCで扱い、利用者に見せるときだけローカル時刻に変換する
            * JSONではISO 8601（`2026-09-27T04:46:57Z`）でやり取りする


            """),
        new(
            "主キーにUUIDv7を使う理由",
            """
            | 項目         | 連番    | UUIDv4 | UUIDv7   |
            | ---------- | ----- | ------ | -------- |
            | 生成する場所     | DB    | どこでも   | どこでも     |
            | 順序         | 作成順   | ランダム   | 作成時刻順    |
            | 推測されやすさ    | 推測できる | できない   | 作成時刻は分かる |
            | インデックスへの追加 | 末尾    | ばらばら   | ほぼ末尾     |

            ```csharp
            Guid id = Guid.CreateVersion7();                // .NET 9 以降
            Guid seededId = Guid.CreateVersion7(timestamp); // 時刻を指定して作る
            ```

            * 先頭の48ビットがミリ秒単位のUNIX時刻なので、作成順に並ぶ
            * UUIDv4はランダムなので、B-treeインデックスのあちこちに挿入されてページ分割が増える
            * 同じミリ秒の中での順序は保証されない。並べ替えの補助（同じ日時の順番を決める）には十分
            * PostgreSQL 18では、DB側でも`uuidv7()`で生成できる


            """),
        new(
            "EF CoreのN+1問題",
            """
            ```csharp
            // NG: ノートの数だけクエリが走る（1 + N 回）
            List<Note> notes = await dbContext.Notes.ToListAsync(cancellationToken);
            foreach (Note note in notes)
            {
                List<Tag> tags = await dbContext.Tags
                    .Where(tag => tag.NoteId == note.Id)
                    .ToListAsync(cancellationToken);
            }

            // OK: まとめて取得する
            List<Note> notesWithTags = await dbContext.Notes
                .Include(note => note.Tags)
                .ToListAsync(cancellationToken);

            // OK: 必要な列だけ射影する
            List<NoteSummaryResponse> summaries = await dbContext.Notes
                .Select(note => new NoteSummaryResponse(note.Id, note.Title))
                .ToListAsync(cancellationToken);
            ```

            * ループの中でクエリを書くと、$1 + N$ 回のクエリになる
            * 遅延読み込み（Lazy Loading）を有効にすると、プロパティに触れただけでクエリが走り、気づきにくい
            * 複数のコレクションを`Include`すると、結合で行数が掛け算で増える。`AsSplitQuery()`で分割できる
            * 発行されたSQLは、`Microsoft.EntityFrameworkCore.Database.Command`のログで確認する


            """),
        new(
            "OpenAPIの型生成で契約を守る",
            """
            ```bash
            cd backend
            dotnet build                 # openapi.json を生成
            cd ../frontend
            npm run api:generate         # schema.d.ts を生成
            ```

            ```ts
            const { data, error } = await apiClient.GET("/api/notes/{id}", {
              params: { path: { id } },
            });
            ```

            * パスやパラメーター、レスポンスの形を間違えると型エラーになる
            * 生成物（openapi.json・schema.d.ts）はコミットし、CIで生成し直して`git diff --exit-code`で差分を検出する
            * `TypedResults`を返すと、レスポンスの型がOpenAPIに反映される。戻り値が`IResult`だけだと型が出ない
            * 型が合っていても、実行時のレスポンスがその形とは限らない（古いサーバーにつないだときなど）


            """),
        new(
            "stateの更新と関数型アップデート",
            """
            ```tsx
            const [count, setCount] = useState(0);

            function handleClick() {
              setCount(count + 1);
              setCount(count + 1);   // どちらも同じ count を見ているので +1 にしかならない
            }

            function handleClickFixed() {
              setCount((prev) => prev + 1);
              setCount((prev) => prev + 1);   // +2
            }
            ```

            * `setState`を呼んでも、変数の値は次のレンダリングまで変わらない
            * 前の値から計算するときは、関数を渡す
            * オブジェクトや配列は直接書き換えず、新しく作る（`{ ...current, title }`）。同じ参照のままだと再レンダリングされない
            * 同じ値をセットした場合、Reactは再レンダリングを省略できる


            """),
        new(
            "useMemoとuseCallbackの使いどころ",
            """
            ```tsx
            const sortedNotes = useMemo(
              () => [...notes].sort((a, b) => a.title.localeCompare(b.title)),
              [notes],
            );

            const handleSelect = useCallback(
              (id: string) => navigate(`/notes/${id}`),
              [navigate],
            );
            ```

            * useMemoは計算結果を、useCallbackは関数そのものを、依存する値が変わるまで使い回す
            * `memo`で包んだ子コンポーネントに渡す関数やオブジェクト、ほかのフックの依存配列に入る値に使うと効果がある
            * 軽い計算なら不要。React Compilerを使うと自動でメモ化される

            ~~すべての関数をuseCallbackで包む~~ → 効果があるのは、再レンダリングや再実行を防げる場合だけ。
            """),
        new(
            "Zodのスキーマと型の導出",
            """
            ```ts
            const draftSchema = z.object({
              title: z.string().trim().max(100, "タイトルは100文字以内で入力してください"),
              content: z.string().max(100_000),
            });

            type Draft = z.infer<typeof draftSchema>;

            const result = draftSchema.safeParse(input);
            if (!result.success) {
              const fieldErrors = z.flattenError(result.error).fieldErrors;
            }
            ```

            * 型はスキーマから導出する。型とスキーマを別々に書くと食い違う
            * `parse`は失敗すると例外を投げ、`safeParse`は結果のオブジェクトを返す
            * `.trim()`や`.transform()`は値を変える。入力の型と出力の型が変わることがある（`z.input`と`z.output`）
            * フォームの空欄は`undefined`ではなく`""`。`.optional()`だけでは空欄を弾けないので`.min(1)`を使う


            """),
        new(
            "Tailwindのクラスを動的に組み立てない",
            """
            ```tsx
            // NG: text-red-500 などのクラスがCSSに生成されない
            <p className={`text-${color}-500`}>...</p>

            // OK: 完全なクラス名を書いておく
            const statusClass = {
              error: "text-destructive",
              success: "text-green-600",
            }[status];

            // 条件付きのクラスは cn() でまとめる
            <p className={cn("text-sm", isError && "text-destructive", className)}>...</p>
            ```

            * Tailwindはソースコードの文字列をそのまま読み取り、見つかったクラスのCSSだけを生成する
            * `cn()`（clsx＋tailwind-merge）は、`p-2`と`p-4`のように競合するクラスを後ろ優先で1つにする
            * `sm:`・`md:`は「その幅以上」の意味。スマートフォン向けを先に書き、広い画面向けを足していく
            * ダークモードは`dark:`で書く。shadcn/uiは`bg-background`などのCSS変数で色を切り替える


            """),
    ];
}
